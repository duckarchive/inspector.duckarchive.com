"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import qs from "qs";

import { SearchRequest } from "@/app/api/search/route";
import { Archives } from "@/data/archives";
import { buildArchiveCodeResolver, foldCodeInput } from "@/lib/translit";

/** Query params from before the fond→inventory→file rename; still honoured on inbound links. */
const LEGACY_KEYS: Record<string, keyof SearchRequest> = {
  fund: "fond",
  description: "inventory",
  case: "file",
};

const useSearch = (archives: Archives): [SearchRequest, (val: SearchRequest) => void] => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = searchParams.toString();

  const resolveArchiveCode = useMemo(
    () => buildArchiveCodeResolver(archives.map((archive) => archive.code)),
    [archives],
  );

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

    // "q" is the shorthand the search boxes push: a single dash-joined full
    // code. Latin input is welcome here — the archive code resolves against
    // the known-code aliases (DAKHMO → ДАХмО) and the rest is folded to
    // Cyrillic — because the API itself rejects Latin letters outright.
    if ("q" in raw && typeof raw.q === "string") {
      const [a, f, i, file] = raw.q.toLocaleUpperCase().split("-");

      parsed.archive = resolveArchiveCode(a || "") || "";
      parsed.fond = f ? foldCodeInput(f) : "";
      parsed.inventory = i ? foldCodeInput(i) : "";
      parsed.file = file ? foldCodeInput(file) : "";
      delete raw.q;
      needsRewrite = true;
    }

    const values = { ...parsed, ...raw };

    return [values, needsRewrite ? qs.stringify(values, { skipNulls: true }) : null] as const;
  }, [query, resolveArchiveCode]);

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
