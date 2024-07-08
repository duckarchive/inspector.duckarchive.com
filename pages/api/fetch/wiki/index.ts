import axios from "axios";
import { parseDBParams } from "../../helpers";
import { Fetch } from "@prisma/client";
import { uniq } from "lodash";

interface PrefixSearchResponse {
  continue?: {
    psoffset: number;
    continue: string;
  };
  query: {
    prefixsearch: { title: string }[];
  };
}

export const fetchAllWikiPagesByPrefix = async ({ api_url, api_params }: Fetch) => {
  const allPages: string[] = [];
  const fetchPages = async (offset: number = 0): Promise<void> => {
    try {
      const params = parseDBParams(api_params);
      const response = await axios.request<PrefixSearchResponse>({
        url: api_url,
        method: "GET",
        params: {
          action: "query",
          list: "prefixsearch",
          pssearch: params.q,
          pslimit: 500,
          format: "json",
          formatversion: 2,
          ...(offset && { psoffset: offset }),
        },
      });
      const pages = response.data.query.prefixsearch.map((page) => page.title);
      allPages.push(...pages);

      if (response.data.continue) {
        await fetchPages(response.data.continue.psoffset);
      }
    } catch (error) {
      console.error(`Error fetching pages: ${error}`);
    }
  };

  await fetchPages();

  return uniq(allPages);
};
