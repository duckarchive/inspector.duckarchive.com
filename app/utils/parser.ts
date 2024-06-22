const ARCH_REGEXP = /^[а-яїє]{3,8}/;


export const parseSearchQuery = (input: string) => {
  const trimmed = input.trim();
  const [archive] = trimmed.match(ARCH_REGEXP) || [];

  return {
    archive
  }
}