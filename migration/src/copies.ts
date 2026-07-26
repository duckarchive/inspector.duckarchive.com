import { PoolClient } from 'pg';

import { ArchiveRow, Stats } from './entities';
import { canonicalizeFullCode, groupedFullCode, parseFamilySearchComposite } from './normalize';
import { ArchiveReport } from './report';

const bump = (stats: Stats, key: string, by = 1): void => {
  stats[key] = (stats[key] ?? 0) + by;
};

/** parsed → canonical full_code(s); FAMILY_SEARCH composites handled separately */
export const canonParsed = (parsed: string, resourceType: string): string | null => {
  if (parsed.includes('(')) {
    if (resourceType !== 'FAMILY_SEARCH') return null;
    const codes = parseFamilySearchComposite(parsed);
    return codes && codes.length === 1 ? codes[0] : null; // multi-file image groups stay unmatched
  }
  return canonicalizeFullCode(parsed);
};

/** Exact canonical match first; else fall back to the base instance when the
 * inventory segment carries a grouping marker (ТОМ/ЧАСТ/П/ПР — see groupedFullCode). */
export const lookupByCanon = (
  byCanon: Map<string, string | null>,
  canon: string,
): { id: string; grouped: boolean } | null => {
  const exact = byCanon.get(canon);
  if (exact) return { id: exact, grouped: false };
  if (byCanon.has(canon)) return null; // canonical collision — never guess
  const grouped = groupedFullCode(canon);
  const base = grouped ? byCanon.get(grouped) : undefined;
  return base ? { id: base, grouped: true } : null;
};

/** Attach fk in chunks; skip any row whose attach would violate the unique
 * (resource_id, fk, parsed, url) index (leaves it NULL). Returns rows actually attached. */
const batchAttach = async (
  client: PoolClient,
  table: 'file_online_copies' | 'inventory_online_copies',
  fkCol: 'file_id' | 'inventory_id',
  pairs: [copyId: string, targetId: string][],
): Promise<number> => {
  let attached = 0;
  for (let i = 0; i < pairs.length; i += 5000) {
    const chunk = pairs.slice(i, i + 5000);
    const res = await client.query(
      `UPDATE ${table} t SET ${fkCol} = v.target_id::uuid
       FROM (SELECT unnest($1::uuid[]) AS id, unnest($2::uuid[]) AS target_id) v
       WHERE t.id = v.id
         AND NOT EXISTS (
           SELECT 1 FROM ${table} x
           WHERE x.resource_id = t.resource_id AND x.${fkCol} = v.target_id::uuid
             AND x.parsed = t.parsed AND x.url = t.url
         )`,
      [chunk.map((p) => p[0]), chunk.map((p) => p[1])],
    );
    attached += res.rowCount ?? 0;
  }
  return attached;
};

/**
 * Attach unattached online copies to files/inventories by matching canonical(parsed) to the
 * target's canonical full_code. Self-contained — depends only on current-schema tables
 * (files/inventories/fonds + the online-copy tables), never on legacy fund/description/case
 * data, so it can run standalone at any time (see attach-copies.ts), independent of migrateCopies.
 */
export const attachFileCopiesByParsed = async (
  client: PoolClient,
  archive: ArchiveRow,
  stats: Stats,
): Promise<void> => {
  const files = await client.query<{ id: string; full_code: string }>(`
    SELECT f.id, f.full_code FROM files f
    JOIN inventories i ON f.inventory_id = i.id
    JOIN fonds fo ON i.fond_id = fo.id
    WHERE fo.archive_id = $1`, [archive.id]);
  const fileByCanon = new Map<string, string | null>(); // null = canonical collision, unusable
  for (const f of files.rows) {
    const canon = canonicalizeFullCode(f.full_code) ?? f.full_code;
    fileByCanon.set(canon, fileByCanon.has(canon) ? null : f.id);
  }

  const leftovers = await client.query<{ id: string; parsed: string; rtype: string }>(`
    SELECT foc.id, foc.parsed, r.type AS rtype
    FROM file_online_copies foc JOIN resources r ON r.id = foc.resource_id
    WHERE foc.file_id IS NULL AND foc.parsed LIKE $1`, [`${archive.code}-%`]);
  const attachC: [string, string][] = [];
  let unmatched = 0;
  let grouped = 0;
  for (const row of leftovers.rows) {
    const canon = canonParsed(row.parsed, row.rtype);
    const match = canon ? lookupByCanon(fileByCanon, canon) : null;
    if (match) {
      attachC.push([row.id, match.id]);
      if (match.grouped) grouped += 1;
    } else unmatched += 1;
  }
  const nC = await batchAttach(client, 'file_online_copies', 'file_id', attachC);
  bump(stats, 'copies_attached_by_parsed', nC);
  bump(stats, 'copies_attached_grouped', grouped);
  bump(stats, 'copies_attach_skipped_dup', attachC.length - nC);
  bump(stats, 'copies_left_unattached', unmatched);
};

export const attachInventoryCopiesByParsed = async (
  client: PoolClient,
  archive: ArchiveRow,
  stats: Stats,
): Promise<void> => {
  const invs = await client.query<{ id: string; full_code: string }>(`
    SELECT i.id, $2 || '-' || fo.code || '-' || i.code AS full_code
    FROM inventories i JOIN fonds fo ON i.fond_id = fo.id WHERE fo.archive_id = $1`,
    [archive.id, archive.code]);
  const invByCanon = new Map<string, string | null>();
  for (const i of invs.rows) {
    const canon = canonicalizeFullCode(i.full_code) ?? i.full_code;
    invByCanon.set(canon, invByCanon.has(canon) ? null : i.id);
  }
  const invLeftovers = await client.query<{ id: string; parsed: string; rtype: string }>(`
    SELECT ioc.id, ioc.parsed, r.type AS rtype
    FROM inventory_online_copies ioc JOIN resources r ON r.id = ioc.resource_id
    WHERE ioc.inventory_id IS NULL AND ioc.parsed LIKE $1`, [`${archive.code}-%`]);
  const attachInv: [string, string][] = [];
  let invUnmatched = 0;
  let invGrouped = 0;
  for (const row of invLeftovers.rows) {
    const canon = canonParsed(row.parsed, row.rtype);
    const match = canon ? lookupByCanon(invByCanon, canon) : null;
    if (match) {
      attachInv.push([row.id, match.id]);
      if (match.grouped) invGrouped += 1;
    } else invUnmatched += 1;
  }
  const nInv = await batchAttach(client, 'inventory_online_copies', 'inventory_id', attachInv);
  bump(stats, 'inv_copies_attached_by_parsed', nInv);
  bump(stats, 'inv_copies_attached_grouped', invGrouped);
  bump(stats, 'inv_copies_attach_skipped_dup', attachInv.length - nInv);
  bump(stats, 'inv_copies_left_unattached', invUnmatched);
};

export const migrateCopies = async (
  client: PoolClient,
  archive: ArchiveRow,
  report: ArchiveReport,
  stats: Stats,
): Promise<void> => {
  // =========== file level ===========
  await client.query(`
    CREATE TEMP TABLE mig_old_copies ON COMMIT DROP AS
    SELECT coc.resource_id, coc.case_id, coc.url, coc.availability, coc.checked_availability_at,
           m.file_id, f.full_code
    FROM case_online_copies coc
    JOIN mig_case_map m USING (case_id)
    JOIN files f ON f.id = m.file_id;
    CREATE INDEX ON mig_old_copies (url);
  `);
  const oldTotal = await client.query('SELECT count(*)::int AS n FROM mig_old_copies');
  bump(stats, 'copies_legacy_total', oldTotal.rows[0].n);

  // Step A0: collapse redundant unattached duplicates before attaching.
  // The new scrape wrote multiple identical rows (same resource_id, parsed, url,
  // file_id NULL) for FamilySearch multi-file image groups. The unique index
  // (resource_id, file_id, parsed, url) tolerates them only while file_id is NULL;
  // attaching them all to one file would violate it. Keep newest, drop the rest.
  // Scoped to this archive's parsed prefix (uses the trigram index; the url-based
  // attach path is de-duplicated inline in A1 instead — an `OR url IN (…)` here
  // defeats every index and full-scans the 2.4M-row table).
  const dedupA0 = await client.query(
    `WITH ranked AS (
       SELECT foc.id, row_number() OVER (
         PARTITION BY foc.resource_id, foc.parsed, foc.url
         ORDER BY foc.checked_availability_at DESC NULLS LAST, foc.id) AS rn
       FROM file_online_copies foc
       WHERE foc.file_id IS NULL AND foc.parsed LIKE $1
     )
     DELETE FROM file_online_copies foc USING ranked
     WHERE foc.id = ranked.id AND ranked.rn > 1`,
    [`${archive.code}-%`],
  );
  bump(stats, 'copies_redundant_dupes_removed', dedupA0.rowCount ?? 0);

  // Step A1: unambiguous url match — url maps to exactly one file.
  // A0 has already collapsed same-(resource_id, parsed, url) duplicates for this
  // archive, so the only within-statement dup risk is gone; the NOT EXISTS guard
  // covers collisions with rows attached in an earlier step. Kept as a plain UPDATE
  // (the window-function variant plans catastrophically on archives with many
  // non-matching legacy urls, e.g. ДАЛО).
  const a1 = await client.query(`
    WITH url_map AS (
      SELECT url, min(file_id::text)::uuid AS file_id
      FROM mig_old_copies GROUP BY url HAVING count(DISTINCT file_id) = 1
    )
    UPDATE file_online_copies foc SET file_id = um.file_id
    FROM url_map um WHERE foc.file_id IS NULL AND foc.url = um.url
      AND NOT EXISTS (
        SELECT 1 FROM file_online_copies x
        WHERE x.resource_id = foc.resource_id AND x.file_id = um.file_id
          AND x.parsed = foc.parsed AND x.url = foc.url
      )`);
  bump(stats, 'copies_attached_by_url', a1.rowCount ?? 0);

  // Step A2: ambiguous urls — disambiguate via canonical(parsed) = canonical(full_code)
  const ambiguous = await client.query<{ id: string; url: string; parsed: string; rtype: string }>(`
    SELECT foc.id, foc.url, foc.parsed, r.type AS rtype
    FROM file_online_copies foc
    JOIN resources r ON r.id = foc.resource_id
    JOIN (SELECT url FROM mig_old_copies GROUP BY url HAVING count(DISTINCT file_id) > 1) amb ON amb.url = foc.url
    WHERE foc.file_id IS NULL`);
  if (ambiguous.rows.length) {
    const candidates = await client.query<{ url: string; file_id: string; full_code: string }>(`
      SELECT DISTINCT oc.url, oc.file_id, oc.full_code
      FROM mig_old_copies oc
      JOIN (SELECT url FROM mig_old_copies GROUP BY url HAVING count(DISTINCT file_id) > 1) amb ON amb.url = oc.url`);
    const byUrl = new Map<string, { file_id: string; canon: string }[]>();
    for (const c of candidates.rows) {
      const canon = canonicalizeFullCode(c.full_code) ?? c.full_code;
      const list = byUrl.get(c.url);
      if (list) list.push({ file_id: c.file_id, canon });
      else byUrl.set(c.url, [{ file_id: c.file_id, canon }]);
    }
    const attach: [string, string][] = [];
    for (const row of ambiguous.rows) {
      const canon = canonParsed(row.parsed, row.rtype);
      const matches = (byUrl.get(row.url) ?? []).filter((c) => c.canon === canon);
      if (canon && matches.length === 1) {
        attach.push([row.id, matches[0].file_id]);
      } else {
        report.anomaly('copy-ambiguous', 'file', row.url, `parsed "${row.parsed}" does not single out one of ${byUrl.get(row.url)?.length ?? 0} candidate files`);
        bump(stats, 'copies_ambiguous_unresolved');
      }
    }
    const n = await batchAttach(client, 'file_online_copies', 'file_id', attach);
    bump(stats, 'copies_attached_by_parsed_disambiguation', n);
    bump(stats, 'copies_attach_skipped_dup', attach.length - n);
  }

  // Step B: legacy copies with no (url, file) counterpart in the new table are NOT imported —
  // new copy tables are scraper-owned; legacy rows only ever serve as a url→instance map for
  // attaching scraped rows (Steps A0-A2, C). Copies missing a scraped counterpart are counted
  // here for visibility, not inserted. See migration/FIX-COPIES.md for the 2026-07-13 correction.
  const b = await client.query(`
    SELECT count(*)::int AS n FROM mig_old_copies oc
    WHERE NOT EXISTS (
      SELECT 1 FROM file_online_copies foc WHERE foc.url = oc.url AND foc.file_id = oc.file_id
    )`);
  bump(stats, 'copies_legacy_only_no_scrape', b.rows[0].n);

  // Step C: leftover unattached new-scrape rows for this archive → match canonical(parsed) to file full_code
  await attachFileCopiesByParsed(client, archive, stats);

  // =========== inventory level ===========
  await client.query(
    `CREATE TEMP TABLE mig_old_inv_copies ON COMMIT DROP AS
     SELECT doc.resource_id, doc.description_id, doc.url, doc.availability, doc.checked_availability_at,
            m.inventory_id,
            $1 || '-' || fo.code || '-' || i.code AS full_code
     FROM description_online_copies doc
     JOIN mig_desc_map m USING (description_id)
     JOIN inventories i ON i.id = m.inventory_id
     JOIN fonds fo ON fo.id = i.fond_id`,
    [archive.code],
  );
  await client.query('CREATE INDEX ON mig_old_inv_copies (url)');
  bump(stats, 'inv_copies_legacy_total',
    (await client.query('SELECT count(*)::int AS n FROM mig_old_inv_copies')).rows[0].n);

  const invDedup = await client.query(
    `WITH ranked AS (
       SELECT ioc.id, row_number() OVER (
         PARTITION BY ioc.resource_id, ioc.parsed, ioc.url
         ORDER BY ioc.checked_availability_at DESC NULLS LAST, ioc.id) AS rn
       FROM inventory_online_copies ioc
       WHERE ioc.inventory_id IS NULL AND ioc.parsed LIKE $1
     )
     DELETE FROM inventory_online_copies ioc USING ranked
     WHERE ioc.id = ranked.id AND ranked.rn > 1`,
    [`${archive.code}-%`],
  );
  bump(stats, 'inv_copies_redundant_dupes_removed', invDedup.rowCount ?? 0);

  const invA1 = await client.query(`
    WITH url_map AS (
      SELECT url, min(inventory_id::text)::uuid AS inventory_id
      FROM mig_old_inv_copies GROUP BY url HAVING count(DISTINCT inventory_id) = 1
    )
    UPDATE inventory_online_copies ioc SET inventory_id = um.inventory_id
    FROM url_map um WHERE ioc.inventory_id IS NULL AND ioc.url = um.url
      AND NOT EXISTS (
        SELECT 1 FROM inventory_online_copies x
        WHERE x.resource_id = ioc.resource_id AND x.inventory_id = um.inventory_id
          AND x.parsed = ioc.parsed AND x.url = ioc.url
      )`);
  bump(stats, 'inv_copies_attached_by_url', invA1.rowCount ?? 0);

  // Step B (inventory level): same policy as file level — count, don't import.
  const invB = await client.query(`
    SELECT count(*)::int AS n FROM mig_old_inv_copies oc
    WHERE NOT EXISTS (
      SELECT 1 FROM inventory_online_copies ioc WHERE ioc.url = oc.url AND ioc.inventory_id = oc.inventory_id
    )`);
  bump(stats, 'inv_copies_legacy_only_no_scrape', invB.rows[0].n);

  await attachInventoryCopiesByParsed(client, archive, stats);
};
