import useSWRInfinite from "swr/infinite";
import { fetcher } from "@/lib/fetcher";
import { GetDescriptionResponse } from "../pages/api/archives/[archive-code]/[fund-code]/[description-code]";

const useDescription = (archiveCode: string, fundCode: string, code: string) => {
  const getKey = (pageIndex: number, previousPageData: GetDescriptionResponse) => {
    if (previousPageData && !previousPageData.cases.length) return null // reached the end
    return `/api/archives/${archiveCode}/${fundCode}/${code}?page=${pageIndex}`
  }
  const { data, error, isLoading } = useSWRInfinite<GetDescriptionResponse>(getKey, fetcher, {
    initialSize: 99,
  });

  const fullData: Partial<GetDescriptionResponse> = {};

  if (data && !isLoading) {
    data?.forEach((pageData) => {
      fullData.cases = [...(fullData.cases || []), ...pageData.cases];
    });
  }
 
  return {
    description: fullData,
    isLoading: isLoading,
    isError: error
  }
}

export default useDescription;