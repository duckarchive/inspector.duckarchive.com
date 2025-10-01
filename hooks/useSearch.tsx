"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import qs from "qs";

import { SearchRequest } from "@/app/api/search/route";

const useSearch = (): [SearchRequest, (val: SearchRequest) => void] => {
  const searchPrams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (search: SearchRequest) => {
    const q = qs.stringify(search, { skipNulls: true });
    if (q !== searchPrams.toString()) {
      router.replace(`${pathname}?${q}`);
    }
  };

  const parsed = qs.parse(searchPrams.toString());

  return [parsed, setSearchParams];
};

export default useSearch;
