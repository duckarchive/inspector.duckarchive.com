import { IRowNode } from "ag-grid-community";
import { intlFormatDistance } from "date-fns/intlFormatDistance";
import { sortText, sortCode, sortDate } from "@duckarchive/framework";

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
export const sortByDate = (a: WithDates, b: WithDates) => sortDate(b.updated_at || b.created_at, a.updated_at || a.created_at);

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
