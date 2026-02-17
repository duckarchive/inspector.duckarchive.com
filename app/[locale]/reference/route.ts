import { ApiReference } from "@scalar/nextjs-api-reference";

const config = {
  url: "/openapi.yml",
};

export const GET = ApiReference(config);
