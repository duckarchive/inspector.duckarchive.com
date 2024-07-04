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

export const fetchAllWikiPagesByPrefix = async ({ api_url, api_headers, api_method, api_params }: Fetch) => {
  const allPages: string[] = [];
  const fetchPages = async (offset: number = 0): Promise<void> => {
    try {
      const response = await axios.request<PrefixSearchResponse>({
        url: api_url,
        method: api_method || "GET",
        headers: parseDBParams(api_headers),
        params: {
          ...parseDBParams(api_params),
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