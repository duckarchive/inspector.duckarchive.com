import prisma from "@/lib/db";
import { YearEntity } from "@/lib/year-entity";

export interface YearAnomalyRow {
  entity: YearEntity;
  parent_id: string;
  label: string;
  start_year: number;
  end_year: number;
}

// Same thresholds as the db-audit years-sanity check: a plausible archival
// year sits within [MIN_YEAR, MAX_YEAR], and start must not be after end.
const MIN_YEAR = 1300;
const MAX_YEAR = 2030;
const ROW_LIMIT = 1000;

const ANOMALY_WHERE = `y.start_year > y.end_year OR y.start_year < ${MIN_YEAR} OR y.end_year > ${MAX_YEAR}`;

interface RawAnomalyRow {
  parent_id: string;
  label: string;
  start_year: number;
  end_year: number;
}

const fetchFondAnomalies = async (): Promise<RawAnomalyRow[]> =>
  prisma.$queryRawUnsafe<RawAnomalyRow[]>(`
    SELECT y.fond_id AS parent_id, a.code || '-' || f.code AS label, y.start_year, y.end_year
    FROM fond_years y
    JOIN fonds f ON f.id = y.fond_id
    JOIN archives a ON a.id = f.archive_id
    WHERE ${ANOMALY_WHERE}
    ORDER BY a.code, f.code
    LIMIT ${ROW_LIMIT + 1};
  `);

const fetchInventoryAnomalies = async (): Promise<RawAnomalyRow[]> =>
  prisma.$queryRawUnsafe<RawAnomalyRow[]>(`
    SELECT y.inventory_id AS parent_id, a.code || '-' || f.code || '-' || i.code AS label, y.start_year, y.end_year
    FROM inventory_years y
    JOIN inventories i ON i.id = y.inventory_id
    JOIN fonds f ON f.id = i.fond_id
    JOIN archives a ON a.id = f.archive_id
    WHERE ${ANOMALY_WHERE}
    ORDER BY a.code, f.code, i.code
    LIMIT ${ROW_LIMIT + 1};
  `);

const fetchFileAnomalies = async (): Promise<RawAnomalyRow[]> =>
  prisma.$queryRawUnsafe<RawAnomalyRow[]>(`
    SELECT y.file_id AS parent_id, fl.full_code AS label, y.start_year, y.end_year
    FROM file_years y
    JOIN files fl ON fl.id = y.file_id
    WHERE ${ANOMALY_WHERE}
    ORDER BY fl.full_code
    LIMIT ${ROW_LIMIT + 1};
  `);

export interface YearAnomaliesResult {
  rows: YearAnomalyRow[];
  truncated: Record<YearEntity, boolean>;
}

export const getYearAnomalies = async (): Promise<YearAnomaliesResult> => {
  const [fondRows, inventoryRows, fileRows] = await Promise.all([
    fetchFondAnomalies(),
    fetchInventoryAnomalies(),
    fetchFileAnomalies(),
  ]);

  const toRows = (entity: YearEntity, rows: RawAnomalyRow[]) => ({
    truncated: rows.length > ROW_LIMIT,
    rows: rows.slice(0, ROW_LIMIT).map((r) => ({ entity, parent_id: r.parent_id, label: r.label, start_year: r.start_year, end_year: r.end_year })),
  });

  const fond = toRows("fond", fondRows);
  const inventory = toRows("inventory", inventoryRows);
  const file = toRows("file", fileRows);

  return {
    rows: [...fond.rows, ...inventory.rows, ...file.rows],
    truncated: { fond: fond.truncated, inventory: inventory.truncated, file: file.truncated },
  };
};

export const deleteYearRange = async (entity: YearEntity, parentId: string, startYear: number, endYear: number): Promise<void> => {
  if (entity === "fond") {
    await prisma.fondYear.deleteMany({ where: { fond_id: parentId, start_year: startYear, end_year: endYear } });
  } else if (entity === "inventory") {
    await prisma.inventoryYear.deleteMany({ where: { inventory_id: parentId, start_year: startYear, end_year: endYear } });
  } else {
    await prisma.fileYear.deleteMany({ where: { file_id: parentId, start_year: startYear, end_year: endYear } });
  }
};
