"use client";

import { fetcher } from "@/lib/fetcher";
import { GetDescriptionResponse } from "../app/api/archives/[archive-code]/[fund-code]/[description-code]/route";
import { useEffect, useState } from "react";
import useSWR from "swr";

const useDescription = (archiveCode: string, fundCode: string, code: string) => {
  const [fullData, setFullData] = useState<GetDescriptionResponse>();
  const pageIndex = Math.floor((fullData?.cases.length || 1) / 5000) || 0;
  const { data, isLoading, error } = useSWR(
    `/api/archives/${archiveCode}/${fundCode}/${code}?page=${pageIndex}`,
    fetcher,
  );

  useEffect(() => {
    console.log("useEffect", isLoading, data);
    if (!isLoading && data?.cases.length) {
      console.log("if", !isLoading);
      setFullData((prev) => ({
        ...data,
        cases: [...(prev?.cases || []), ...data.cases],
      }));
    }
  }, [isLoading]);

  return {
    description: fullData,
    isLoading,
    isError: error,
    page: pageIndex + 1
  };
};

export default useDescription;
