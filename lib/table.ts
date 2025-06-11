import { IRowNode } from "ag-grid-community";
import { intlFormatDistance } from "date-fns/intlFormatDistance";

export const sortNumeric = (a: string, b: string) => parseInt(a) - parseInt(b);

export const sortText = (a: string, b: string) => a.localeCompare(b);

const groups = ["П", "Р", ""];
export const sortCode = (a: string, b: string) => {
  const upA = a.toUpperCase();
  const upB = b.toUpperCase();
  const idxA = groups.findIndex((group) => upA.startsWith(group));
  const idxB = groups.findIndex((group) => upB.startsWith(group));
  const qA = idxA - 1;
  const qB = idxB - 1;
  const pureA = upA.replace(/[^0-9]/g, "");
  const pureB = upB.replace(/[^0-9]/g, "");
  if (pureA === pureB) return qB - qA;
  return sortNumeric(pureA, pureB);
};

interface WithCode {
  code: string;
}
export const sortByCode = (a: WithCode, b: WithCode) => sortCode(a.code, b.code);

export const sortByTextCode = (a: WithCode, b: WithCode) => {
  return sortText(a.code, b.code);
};


interface WithTitle {
  title: string | null;
}
export const sortByTitle = (a: WithTitle, b: WithTitle) => {
  return sortText(a.title || "", b.title || "");
};

interface WithType {
  type: string | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sortByType = (_a: any, _b: any, a: { data: WithType }, b: { data: WithType }) => {
  return sortText(a.data.type || "", b.data.type || "");
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const sortByMatches = (_: any, __: any, a: IRowNode<any>, b: IRowNode<any>) => {
  if (!a.data || !b.data) return 0;
  return (
    b.data.matches.reduce((acc: number, { children_count }: WithMatches['matches'][number]) => acc + (children_count || 0), 0) -
    a.data.matches.reduce((acc: number, { children_count }: WithMatches['matches'][number]) => acc + (children_count || 0), 0)
  );
};

export const getSyncAtLabel = (updatedAt?: Date | string | null, withoutPrefix?: boolean) => {
  const prefix = withoutPrefix ? "" : "Перевірено ";
  return updatedAt
    ? `${prefix}${intlFormatDistance(new Date(updatedAt), new Date(), {
        locale: "uk",
      })}`
    : "Не синхронізовано";
};
