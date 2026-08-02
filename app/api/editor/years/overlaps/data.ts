import prisma from "@/lib/db";
import { YearEntity, YearRangeRow } from "@/lib/year-entity";

export interface YearOverlapGroup {
  entity: YearEntity;
  parent_id: string;
  label: string;
  ranges: YearRangeRow[];
}

const GROUP_LIMIT = 500;

interface RawOverlapRow {
  parent_id: string;
  label: string;
  ranges: YearRangeRow[];
}

// "gaps and islands": order each parent's ranges by start_year, flag a row as
// starting a new cluster when its start is past the max end seen so far among
// all earlier rows for that parent, then group consecutive rows sharing a
// cluster id. Equivalent to the classic "merge overlapping intervals" sweep,
// expressed as window functions so the 2M-row file_years table never leaves Postgres.
const OVERLAP_CTE = (yearsTable: string, idColumn: string) => `
  WITH candidates AS (
    SELECT ${idColumn} FROM ${yearsTable} GROUP BY ${idColumn} HAVING count(*) > 1
  ),
  ordered AS (
    SELECT
      y.${idColumn} AS parent_id,
      y.start_year,
      y.end_year,
      y.start_year <= MAX(y.end_year) OVER (
        PARTITION BY y.${idColumn} ORDER BY y.start_year, y.end_year
        ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
      ) AS overlaps_prev
    FROM ${yearsTable} y
    WHERE y.${idColumn} IN (SELECT ${idColumn} FROM candidates)
  ),
  clustered AS (
    SELECT *,
      count(*) FILTER (WHERE overlaps_prev IS NOT TRUE) OVER (
        PARTITION BY parent_id ORDER BY start_year, end_year
      ) AS cluster_id
    FROM ordered
  )
`;

const fetchFondOverlaps = async (): Promise<RawOverlapRow[]> =>
  prisma.$queryRawUnsafe<RawOverlapRow[]>(`
    ${OVERLAP_CTE("fond_years", "fond_id")}
    SELECT c.parent_id, a.code || '-' || f.code AS label,
      json_agg(json_build_object('start_year', c.start_year, 'end_year', c.end_year) ORDER BY c.start_year) AS ranges
    FROM clustered c
    JOIN fonds f ON f.id = c.parent_id
    JOIN archives a ON a.id = f.archive_id
    GROUP BY c.parent_id, c.cluster_id, a.code, f.code
    HAVING count(*) > 1
    ORDER BY a.code, f.code
    LIMIT ${GROUP_LIMIT + 1};
  `);

const fetchInventoryOverlaps = async (): Promise<RawOverlapRow[]> =>
  prisma.$queryRawUnsafe<RawOverlapRow[]>(`
    ${OVERLAP_CTE("inventory_years", "inventory_id")}
    SELECT c.parent_id, a.code || '-' || f.code || '-' || i.code AS label,
      json_agg(json_build_object('start_year', c.start_year, 'end_year', c.end_year) ORDER BY c.start_year) AS ranges
    FROM clustered c
    JOIN inventories i ON i.id = c.parent_id
    JOIN fonds f ON f.id = i.fond_id
    JOIN archives a ON a.id = f.archive_id
    GROUP BY c.parent_id, c.cluster_id, a.code, f.code, i.code
    HAVING count(*) > 1
    ORDER BY a.code, f.code, i.code
    LIMIT ${GROUP_LIMIT + 1};
  `);

const fetchFileOverlaps = async (): Promise<RawOverlapRow[]> =>
  prisma.$queryRawUnsafe<RawOverlapRow[]>(`
    ${OVERLAP_CTE("file_years", "file_id")}
    SELECT c.parent_id, fl.full_code AS label,
      json_agg(json_build_object('start_year', c.start_year, 'end_year', c.end_year) ORDER BY c.start_year) AS ranges
    FROM clustered c
    JOIN files fl ON fl.id = c.parent_id
    GROUP BY c.parent_id, c.cluster_id, fl.full_code
    HAVING count(*) > 1
    ORDER BY fl.full_code
    LIMIT ${GROUP_LIMIT + 1};
  `);

export interface YearOverlapsResult {
  groups: YearOverlapGroup[];
  /** Per-entity: true if results were capped and more overlap groups likely exist. */
  truncated: Record<YearEntity, boolean>;
}

export const getYearOverlaps = async (): Promise<YearOverlapsResult> => {
  const [fondRows, inventoryRows, fileRows] = await Promise.all([
    fetchFondOverlaps(),
    fetchInventoryOverlaps(),
    fetchFileOverlaps(),
  ]);

  const toGroups = (entity: YearEntity, rows: RawOverlapRow[]) => ({
    truncated: rows.length > GROUP_LIMIT,
    groups: rows.slice(0, GROUP_LIMIT).map((r) => ({ entity, parent_id: r.parent_id, label: r.label, ranges: r.ranges })),
  });

  const fond = toGroups("fond", fondRows);
  const inventory = toGroups("inventory", inventoryRows);
  const file = toGroups("file", fileRows);

  return {
    groups: [...fond.groups, ...inventory.groups, ...file.groups],
    truncated: { fond: fond.truncated, inventory: inventory.truncated, file: file.truncated },
  };
};

export class MergeConflictError extends Error {}

/** Union the given ranges into one row for the parent. Re-checks the exact rows still
 * exist first so a stale client (analyzed, then someone else edited) can't corrupt data. */
export const mergeYearRanges = async (entity: YearEntity, parentId: string, ranges: YearRangeRow[]): Promise<void> => {
  if (ranges.length < 2) throw new Error("Потрібно щонайменше 2 діапазони для об'єднання");

  const start_year = Math.min(...ranges.map((r) => r.start_year));
  const end_year = Math.max(...ranges.map((r) => r.end_year));

  await prisma.$transaction(async (tx) => {
    if (entity === "fond") {
      const current = await tx.fondYear.findMany({ where: { fond_id: parentId }, select: { start_year: true, end_year: true } });
      assertRangesUnchanged(current, ranges);
      await tx.fondYear.deleteMany({ where: { fond_id: parentId, OR: ranges } });
      await tx.fondYear.create({ data: { fond_id: parentId, start_year, end_year } });
    } else if (entity === "inventory") {
      const current = await tx.inventoryYear.findMany({ where: { inventory_id: parentId }, select: { start_year: true, end_year: true } });
      assertRangesUnchanged(current, ranges);
      await tx.inventoryYear.deleteMany({ where: { inventory_id: parentId, OR: ranges } });
      await tx.inventoryYear.create({ data: { inventory_id: parentId, start_year, end_year } });
    } else {
      const current = await tx.fileYear.findMany({ where: { file_id: parentId }, select: { start_year: true, end_year: true } });
      assertRangesUnchanged(current, ranges);
      await tx.fileYear.deleteMany({ where: { file_id: parentId, OR: ranges } });
      await tx.fileYear.create({ data: { file_id: parentId, start_year, end_year } });
    }
  });
};

const assertRangesUnchanged = (current: YearRangeRow[], expected: YearRangeRow[]) => {
  const key = (r: YearRangeRow) => `${r.start_year}-${r.end_year}`;
  const currentKeys = new Set(current.map(key));
  if (!expected.every((r) => currentKeys.has(key(r)))) {
    throw new MergeConflictError("Дані змінились з моменту аналізу — повторіть аналіз");
  }
};
