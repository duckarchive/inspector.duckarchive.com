"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import qs from "qs";

import { SearchRequest } from "@/app/api/search/route";
import { Archives } from "@/data/archives";

/** Query params from before the fond→inventory→file rename; still honoured on inbound links. */
const LEGACY_KEYS: Record<string, keyof SearchRequest> = {
  fund: "fond",
  description: "inventory",
  case: "file",
};

const standardizeArchiveCode = (code: string, archives: Archives) => {
  const archive = archives.find((archive) => archive.code.toLocaleLowerCase() === code.toLocaleLowerCase());

  return archive ? archive.code : "";
};

const useSearch = (archives: Archives): [SearchRequest, (val: SearchRequest) => void] => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.toString();

  const [values, canonicalQuery] = useMemo(() => {
    const parsed: SearchRequest = {};
    const raw = qs.parse(query);
    let needsRewrite = false;

    Object.entries(LEGACY_KEYS).forEach(([legacy, current]) => {
      if (legacy in raw) {
        if (!(current in raw)) {
          raw[current] = raw[legacy];
        }
        delete raw[legacy];
        needsRewrite = true;
      }
    });

    // The API no longer accepts a single "year" (it would be rejected as an
    // unknown field); old links are rewritten to the range it used to mean.
    if ("year" in raw && typeof raw.year === "string") {
      if (!("year_from" in raw)) {
        raw.year_from = raw.year;
      }
      if (!("year_to" in raw)) {
        raw.year_to = raw.year;
      }
      delete raw.year;
      needsRewrite = true;
    }

    // "q" is the shorthand the search boxes push: a single dash-joined full code
    if ("q" in raw && typeof raw.q === "string") {
      const [a, f, i, file] = raw.q.toLocaleUpperCase().split("-");

      parsed.archive = standardizeArchiveCode(a, archives);
      parsed.fond = f || "";
      parsed.inventory = i || "";
      parsed.file = file || "";
      delete raw.q;
      needsRewrite = true;
    }

    const values = { ...parsed, ...raw };

    return [values, needsRewrite ? qs.stringify(values, { skipNulls: true }) : null] as const;
  }, [query, archives]);

  // Rewriting the URL is a side effect: doing it while rendering throws on the
  // server ("location is not defined") for any shared/bookmarked search link.
  useEffect(() => {
    if (canonicalQuery !== null && canonicalQuery !== query) {
      router.replace(`${pathname}?${canonicalQuery}`, { scroll: false });
    }
  }, [canonicalQuery, query, pathname, router]);

  const setSearchParams = (search: SearchRequest) => {
    const next = qs.stringify(search, { skipNulls: true });

    if (next !== query) {
      router.replace(`${pathname}?${next}`, { scroll: false });
    }
  };

  return [values, setSearchParams];
};

export default useSearch;
