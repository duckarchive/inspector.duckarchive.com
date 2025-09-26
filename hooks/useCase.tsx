import { GetCaseResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/route";
import { useGet } from "@/hooks/useApi";

const useCase = (archiveCode: string, fundCode: string, caseCode: string, code: string) => {
  const { data, error, isLoading } = useGet<GetCaseResponse>(`/api/archives/${archiveCode}/${fundCode}/${caseCode}/${code}`)
 
  return {
    caseItem: data,
    isLoading,
    isError: error
  }
}

export default useCase;