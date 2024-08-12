"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archives } from "../data/archives";
import { SearchRequest } from "../pages/api/search";

const standardizeArchiveCode = (code: string, archives: Archives) => {
  const archive = archives.find((archive) => archive.code.toLocaleLowerCase() === code.toLocaleLowerCase());

  return archive ? archive.code : "";
};

const useSearch = (archives: Archives): [SearchRequest, (val: SearchRequest) => void] => {
  const searchPrams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (search: SearchRequest) => {
    router.replace(`${pathname}?q=${search.a}-${search.f}-${search.d}-${search.c}`);
  };

  const q = searchPrams?.get("q");
  if (!q) {
    return [
      {
        a: "",
        f: "",
        d: "",
        c: "",
      },
      setSearchParams,
    ];
  }
  const upperCased = q.toLocaleUpperCase();
  const [a, f, d, c] = upperCased.split("-");

  return [
    {
      a: standardizeArchiveCode(a, archives),
      f: f || "",
      d: d || "",
      c: c || "",
    },
    setSearchParams,
  ];
};

export default useSearch;
