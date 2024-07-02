import { intlFormatDistance } from "date-fns/intlFormatDistance";

export const sortNumeric = (a: string, b: string) => parseInt(a) - parseInt(b);

interface WithCode {
  code: string;
}
export const sortByCode = (a: WithCode, b: WithCode) => sortNumeric(a.code, b.code);

export const sortByTextCode = (a: WithCode, b: WithCode) => {
  return a.code.localeCompare(b.code);
};

interface WithDates {
  created_at: Date | string;
  updated_at?: Date | string | null;
}
export const sortByDate = (a: WithDates, b: WithDates) => {
  return new Date(b.updated_at || b.created_at).valueOf() - new Date(a.updated_at || a.created_at).valueOf();
};

interface WithMatches {
  matches: { children_count: number | null }[];
}

export const sortByMatches = (a?: WithMatches, b?: WithMatches) => {
  if (!a || !b) return 0;
  return (
    b.matches.reduce((acc, { children_count }) => acc + (children_count || 0), 0) -
    a.matches.reduce((acc, { children_count }) => acc + (children_count || 0), 0)
  );
};

export const getSyncAtLabel = (updatedAt?: Date | string | null, withoutPrefix?: boolean) => {
  const prefix = withoutPrefix ? "" : "Оновлено ";
  return updatedAt
    ? `${prefix}${intlFormatDistance(new Date(updatedAt), new Date(), {
        locale: "uk",
      })}`
    : "Не синхронізовано";
};
