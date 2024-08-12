import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { GetDescriptionResponse } from "../pages/api/archives/[archive-code]/[fund-code]/[description-code]";

const useDescription = (archiveCode: string, fundCode: string, code: string) => {
  const { data, error, isLoading } = useSWR<GetDescriptionResponse>(`/api/archives/${archiveCode}/${fundCode}/${code}`, fetcher)
 
  return {
    description: data,
    isLoading,
    isError: error
  }
}

export default useDescription;