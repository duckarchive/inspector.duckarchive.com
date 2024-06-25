interface WithCode {
  code: string;
}
export const sortByCode = (a: WithCode, b: WithCode) => {
  return parseInt(a.code) - parseInt(b.code);
};

export const sortByTextCode = (a: WithCode, b: WithCode) => {
  return a.code.localeCompare(b.code);
};

interface WithDates {
  created_at: Date | string;
  updated_at?: Date | string | null;
}
export const sortByDate = (a: WithDates, b: WithDates) => {
  return (
    new Date(b.updated_at || b.created_at).valueOf() -
    new Date(a.updated_at || a.created_at).valueOf()
  );
};
