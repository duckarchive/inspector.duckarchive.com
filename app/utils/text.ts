interface Credentials {
  archive: string;
  fund: string;
  description: string;
  case: string;
}

export const toText = (credentials: Partial<Credentials>): string => {
  // "archive fund-description-case"
  // "archive fund-description"
  // "archive fund"
  // "archive"

  let result = "";

  if (credentials.archive) {
    result += `${credentials.archive} `;
  }

  if (credentials.fund) {
    result += `${credentials.fund}`;
  }

  if (credentials.description) {
    result += `-${credentials.description}`;
  }

  if (credentials.case) {
    result += `-${credentials.case}`;
  }

  return result.trim();
};