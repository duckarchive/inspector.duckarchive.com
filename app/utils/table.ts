export const sortByCode = (a: { code: string }, b: { code: string }) => {
  return parseInt(a.code) - parseInt(b.code);
}