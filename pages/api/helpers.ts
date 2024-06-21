export const parseDBParams = (str: string | null): Record<string, string> => {
  const result: Record<string, string> = {};

  str?.split(',').map((param) => {
    const [key, value] = param.split(':');
    result[key.trim()] = value.trim();
  });

  return result;
};