export type YearEntity = "fond" | "inventory" | "file";

/** Shared by client (labels) and server (route/data) code, unlike the prisma-backed data.ts files. */
export const YEAR_ENTITY_LABELS: Record<YearEntity, string> = {
  fond: "Фонд",
  inventory: "Опис",
  file: "Справа",
};

export interface YearRangeRow {
  start_year: number;
  end_year: number;
}
