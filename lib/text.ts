/** `unknownLabel` lets UI callers pass a localized fallback; data exports keep the Ukrainian default. */
export const getYearsString = (years: { start_year: number; end_year: number }[], unknownLabel = "невідомо") => {
  const filteredYears = years.filter(({ start_year, end_year }) => Boolean(start_year) || Boolean(end_year));
  if (!filteredYears.length) return unknownLabel;
  return filteredYears.map(({ start_year, end_year }) => {
    if (!end_year || start_year === end_year) return `${start_year}`;
    return `${start_year}-${end_year}`;
  }).join(", ");
};
