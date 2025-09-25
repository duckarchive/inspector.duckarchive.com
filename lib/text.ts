export const getYearsString = (start: number, end?: number | null) => {
  if (!start) return "невідомий";
  if (!end || start === end) return `${start}`;
  return `${start}-${end}`;
};
