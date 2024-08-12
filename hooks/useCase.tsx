import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { GetCaseResponse } from "../pages/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]";

const useCase = (archiveCode: string, fundCode: string, caseCode: string, code: string) => {
  const { data, error, isLoading } = useSWR<GetCaseResponse>(`/api/archives/${archiveCode}/${fundCode}/${caseCode}/${code}`, fetcher)
 
  return {
    caseItem: data,
    isLoading,
    isError: error
  }
}

export default useCase;