import prisma from "@/lib/db";
import { Prisma } from "@generated/prisma/client/client";

export interface AutolinkCounts {
  files: number;
  inventories: number;
}

export interface AutolinkPreview {
  /** Verbatim matches: `parsed` equals a file `full_code` / constructed inventory full code. */
  strict: AutolinkCounts;
  /** All unambiguous matches, including normalized / FS-blob / том-частина / опис-range ones. */
  wide: AutolinkCounts;
}

/**
 * Matches unlinked online copies to files AND inventories by code, producing
 * `matches(id, target, target_id, is_strict)` — at most one row per copy, only
 * when exactly one candidate fits at the winning priority (ambiguous folds are
 * dropped; ~0 in practice). Copies with a pending action are excluded so a
 * re-run can't double-propose.
 *
 * Priority per copy: file direct → file том/частина fallback → inventory
 * direct → inventory file-range. Inventories have no stored full_code, so
 * their codes are constructed as архів-фонд-опис on the fly.
 *
 * Normalization mirrors the rules validated during the 2026-08-05 bulk linking
 * (99.85% agreement with the 2.5M existing file links; disagreements are the
 * Р-prefix fond variants and ДОД inventories an admin reviews anyway):
 *  - FamilySearch blobs `АРХІВ-(ref+++volume+++title)` → архів + first segment;
 *  - uppercase + Latin homoglyphs → Cyrillic, spaces collapsed;
 *  - `Р-123` / `Р.123` / `П-123` fond prefixes glued to `Р123`;
 *  - trailing `том N` / `ч.N` volume suffixes stripped, but only as a fallback
 *    when the un-stripped code matches nothing (parts share the base справа);
 *  - inventory rules: trailing `(опис)` marker stripped, and file ranges
 *    `архів-фонд-опис-start-end` (end > start) truncated to the опис.
 *
 * The fold of all 3.3M `files.full_code` values is the expensive part — the
 * whole thing runs tens of seconds for counting and ~2min for inserting, which
 * is why the feature sits behind an explicit admin button with a waiting modal.
 */
const MATCH_CTE = Prisma.sql`
  WITH unlinked AS (
    SELECT oc.id, oc.parsed,
      CASE
        WHEN oc.parsed LIKE '%+++%' AND oc.parsed ~ '^[^()]+-\\(.*\\)$'
          THEN substring(oc.parsed from '^([^()]+)-\\(') || '-' ||
               trim(split_part(substring(oc.parsed from '^[^()]+-\\((.*)\\)$'), '+++', 1))
        ELSE oc.parsed
      END AS code0
    FROM online_copies oc
    WHERE oc.inventory_id IS NULL AND oc.file_id IS NULL AND oc.parsed <> ''
      AND NOT EXISTS (SELECT 1 FROM file_actions fa WHERE fa.online_copy_id = oc.id AND fa.resolved_at IS NULL)
      AND NOT EXISTS (SELECT 1 FROM inventory_actions ia WHERE ia.online_copy_id = oc.id AND ia.resolved_at IS NULL)
  ),
  norm AS (
    SELECT id, parsed,
      regexp_replace(
        regexp_replace(
          translate(upper(code0), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ'),
          '-(Р|П)[-. ](?=\\d)', '-\\1', 'g'),
        '\\s+', '', 'g') AS code
    FROM unlinked
  ),
  stripped AS (
    SELECT id, parsed, code,
      regexp_replace(code, '\\(?(Ч|ТОМ|Т|ЧАСТИНА)\\.?\\d+\\)?$', '') AS code_base,
      regexp_replace(code, '-?\\(?(ОПИС|ОПИСЬ)\\)?$', '') AS inv_code
    FROM norm
  ),
  inv_ranges AS (
    SELECT id,
      CASE WHEN inv_code ~ '^.+-\\d+-\\d+$'
            AND (substring(inv_code from '-(\\d+)-\\d+$'))::numeric < (substring(inv_code from '-(\\d+)$'))::numeric
           THEN substring(inv_code from '^(.+)-\\d+-\\d+$') END AS range_prefix
    FROM stripped
  ),
  ff AS (
    SELECT id AS file_id, full_code,
      translate(upper(full_code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
    FROM files WHERE full_code <> ''
  ),
  ii AS (
    SELECT i.id AS inventory_id,
      a.code || '-' || f.code || '-' || i.code AS full_code,
      translate(upper(a.code || '-' || f.code || '-' || i.code), 'ABCEHIKMOPTXY', 'АВСЕНІКМОРТХУ') AS folded
    FROM inventories i
    JOIN fonds f ON f.id = i.fond_id
    JOIN archives a ON a.id = f.archive_id
  ),
  all_m AS (
    SELECT s.id, 1 AS pri, 'file' AS target, f.file_id AS target_id, (f.full_code = s.parsed) AS strict
    FROM stripped s JOIN ff f ON f.folded = s.code
    UNION ALL
    SELECT s.id, 2, 'file', f.file_id, false
    FROM stripped s JOIN ff f ON f.folded = s.code_base WHERE s.code_base <> s.code
    UNION ALL
    SELECT s.id, 3, 'inventory', i.inventory_id, (i.full_code = s.parsed)
    FROM stripped s JOIN ii i ON i.folded = s.inv_code
    UNION ALL
    SELECT r.id, 4, 'inventory', i.inventory_id, false
    FROM inv_ranges r JOIN ii i ON i.folded = r.range_prefix
    WHERE r.range_prefix IS NOT NULL
  ),
  best AS (
    SELECT id, min(pri) AS pri FROM all_m GROUP BY id
  ),
  matches AS (
    SELECT m.id, m.target, min(m.target_id::text)::uuid AS target_id,
      bool_or(m.strict) AS is_strict
    FROM all_m m JOIN best b ON b.id = m.id AND b.pri = m.pri
    GROUP BY m.id, m.target
    HAVING count(DISTINCT m.target_id) = 1
  )
`;

export const getAutolinkPreview = async (): Promise<AutolinkPreview> => {
  const [row] = await prisma.$queryRaw<
    Array<{ strict_files: number; wide_files: number; strict_inventories: number; wide_inventories: number }>
  >(Prisma.sql`
    ${MATCH_CTE}
    SELECT
      count(*) FILTER (WHERE target = 'file' AND is_strict)::int AS strict_files,
      count(*) FILTER (WHERE target = 'file')::int AS wide_files,
      count(*) FILTER (WHERE target = 'inventory' AND is_strict)::int AS strict_inventories,
      count(*) FILTER (WHERE target = 'inventory')::int AS wide_inventories
    FROM matches
  `);
  return {
    strict: { files: row?.strict_files ?? 0, inventories: row?.strict_inventories ?? 0 },
    wide: { files: row?.wide_files ?? 0, inventories: row?.wide_inventories ?? 0 },
  };
};

/** Creates one pending connect_to_online_copy action per match — file matches in
 * file_actions, inventory matches in inventory_actions, in a single statement;
 * the partial unique indexes on (type, online_copy_id, target) make re-runs
 * idempotent via ON CONFLICT DO NOTHING. */
export const createAutolinkActions = async (strict: boolean, createdBy: string): Promise<AutolinkCounts> => {
  const strictFilter = strict ? Prisma.sql`AND is_strict` : Prisma.empty;
  const [row] = await prisma.$queryRaw<Array<{ files: number; inventories: number }>>(Prisma.sql`
    ${MATCH_CTE},
    ins_files AS (
      INSERT INTO file_actions (created_by, type, online_copy_id, file_id)
      SELECT ${createdBy}, 'connect_to_online_copy'::"ActionType", id, target_id
      FROM matches WHERE target = 'file' ${strictFilter}
      ON CONFLICT DO NOTHING
      RETURNING 1
    ),
    ins_inventories AS (
      INSERT INTO inventory_actions (created_by, type, online_copy_id, inventory_id)
      SELECT ${createdBy}, 'connect_to_online_copy'::"ActionType", id, target_id
      FROM matches WHERE target = 'inventory' ${strictFilter}
      ON CONFLICT DO NOTHING
      RETURNING 1
    )
    SELECT
      (SELECT count(*) FROM ins_files)::int AS files,
      (SELECT count(*) FROM ins_inventories)::int AS inventories
  `);
  return { files: row?.files ?? 0, inventories: row?.inventories ?? 0 };
};
