const ARCH_REGEXP = /^([а-яїєі]{3,8})\s+(.+)-(\d+)-(\d+)/i;

export const parseSearchQuery = (input: string) => {
  const [archiveCode, rest] = input.split(" ").map((s) => s.trim());
  const [fundCode, descriptionCode, caseCode] = rest.split("-").map((s) => s.trim());
  // const [_, archiveCode, fundCode, descriptionCode, caseCode] = trimmed.match(ARCH_REGEXP) || [];

  return {
    archiveCode,
    fundCode,
    descriptionCode,
    caseCode,
  };
};
