"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import qs from "qs";

import { SearchRequest } from "@/app/api/search/route";
import { Archives } from "@/data/archives";

const standardizeArchiveCode = (code: string, archives: Archives) => {
  const archive = archives.find((archive) => archive.code.toLocaleLowerCase() === code.toLocaleLowerCase());

  return archive ? archive.code : "";
};

const useSearch = (archives: Archives): [SearchRequest, (val: SearchRequest) => void] => {
  const searchPrams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (search: SearchRequest) => {
    const q = qs.stringify(search, { skipNulls: true });
    if (q !== searchPrams.toString()) {
      router.replace(`${pathname}?${q}`, { scroll: false });
    }
  };

  const parsed: SearchRequest = {};
  const raw = qs.parse(searchPrams.toString());

  if ("q" in raw && typeof raw.q === "string") {
    const upperCased = raw.q.toLocaleUpperCase();
    const [a, f, d, c] = upperCased.split("-");

    parsed.archive = standardizeArchiveCode(a, archives);
    parsed.fund = f || "";
    parsed.description = d || "";
    parsed.case = c || "";
    delete raw.q;
    const q = qs.stringify({ ...parsed, ...raw }, { skipNulls: true });
    if (q !== searchPrams.toString()) {
      router.replace(`${pathname}?${q}`, { scroll: false });
    }
  }

  return [{ ...parsed, ...raw }, setSearchParams];
};

export default useSearch;
