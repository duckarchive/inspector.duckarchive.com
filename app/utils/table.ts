import { intlFormatDistance } from "date-fns/intlFormatDistance";

export const sortNumeric = (a: string, b: string) => parseInt(a) - parseInt(b);

export const sortText = (a: string, b: string) => a.localeCompare(b);

interface WithCode {
  code: string;
}

interface WithTitle {
  title: string | null;
}
export const sortByCode = (a: WithCode, b: WithCode) => sortCode(a.code, b.code);

const groups = ["П", "Р", ""];
export const sortCode = (a: string, b: string) => {
  const upA = a.toUpperCase();
  const upB = b.toUpperCase();
  const idxA = groups.findIndex((group) => upA.startsWith(group));
  const idxB = groups.findIndex((group) => upB.startsWith(group));
  const qA = idxA + 1;
  const qB = idxB + 1;
  const pureA = upA.replace(/[^0-9]/g, "");
  const pureB = upB.replace(/[^0-9]/g, "");
  if (pureA === pureB) return qB - qA;
  return sortNumeric(pureA, pureB);
};

export const sortByTextCode = (a: WithCode, b: WithCode) => {
  return sortText(a.code, b.code);
};

export const sortByTitle = (a: WithTitle, b: WithTitle) => {
  return sortText(a.title || "", b.title || "");
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
