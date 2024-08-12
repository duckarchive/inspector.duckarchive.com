import { Archive, Case, Description, Fund, Match } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";

export type SearchRequest = Partial<{
  a: string;
  f: string;
  d: string;
  c: string;
}>;

export type SearchResponse = {
  id: Match["id"];
  archive_code: Archive["code"];
  fund_code: Fund["code"];
  description_code: Description["code"];
  case_code: Case["code"];
  url: Match["url"];
}[];

export default async function handler(req: NextApiRequest, res: NextApiResponse<SearchResponse>) {
  const { a, f, d, c } = req.body;
  if (req.method === "POST") {
    const _a = a || "%"; // case sensitive
    const rest = `${f || "%"}-${d || "%"}-${c || "%"}`.toUpperCase();
    const matches = await prisma.match.findMany({
      where: {
        full_code: `${_a}-${rest}`,
      },
      take: 20,
    });

    const searchResults = matches
      .map((match) => {
        if (!match.full_code) {
          return null;
        }
        const [archive_code, fund_code, description_code, case_code] = match.full_code.split("-");

        return {
          id: match.id,
          archive_code,
          fund_code,
          description_code,
          case_code,
          url: match.url,
        };
      })
      .filter((match) => match) as SearchResponse;

    if (searchResults) {
      res.json(searchResults);
    } else {
      res.status(404);
    }
  }
}
