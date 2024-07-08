const ARCH_REGEXP = /^([а-яїєі]{3,8})\s+(.+)-(\d+)/i;

export const parseSearchQuery = (input: string) => {
  const trimmed = input.trim();
  const [_, archiveCode, fundCode, descriptionCode, caseCode] = trimmed.match(ARCH_REGEXP) || [];

  return {
    archiveCode,
    fundCode,
    descriptionCode,
    caseCode,
  };
};
