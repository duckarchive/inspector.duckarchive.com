"use client";

import { GetDescriptionResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/route";
import { useGet } from "@/hooks/useApi";
import { useEffect, useState } from "react";

const useDescription = (archiveCode: string, fundCode: string, code: string) => {
  const [fullData, setFullData] = useState<GetDescriptionResponse>();
  const pageIndex = Math.floor((fullData?.cases.length || 1) / 5000) || 0;
  const { data, isLoading, error } = useGet<GetDescriptionResponse>(`/api/archives/${archiveCode}/${fundCode}/${code}?page=${pageIndex}`);

  useEffect(() => {
    if (!isLoading && data) {
      setFullData((prev) => ({
        ...data,
        cases: [...(prev?.cases || []), ...data.cases],
      }));
    }
  }, [isLoading, data]);

  return {
    description: fullData,
    isLoading,
    isError: error,
    page: pageIndex + 1,
  };
};

export default useDescription;
