"use client";

import { GetInventoryResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/route";
import { useGet } from "@/hooks/useApi";
import { useEffect, useState } from "react";

const useInventory = (archiveCode: string, fondCode: string, code: string) => {
  const [fullData, setFullData] = useState<GetInventoryResponse>();
  const pageIndex = Math.floor((fullData?.files.length || 1) / 5000) || 0;
  const { data, isLoading, error } = useGet<GetInventoryResponse>(`/api/catalog/${archiveCode}/${fondCode}/${code}?page=${pageIndex}`);

  useEffect(() => {
    if (!isLoading && data) {
      setFullData((prev) => ({
        ...data,
        files: [...(prev?.files || []), ...data.files],
      }));
    }
  }, [isLoading, data]);

  return {
    inventory: fullData,
    isLoading,
    isError: error,
    page: pageIndex + 1,
  };
};

export default useInventory;
