import { GetFundResponse } from "@/app/api/archives/[archive-code]/[fund-code]/route";
import { useGet } from "@/hooks/useApi";

const useFund = (archiveCode: string, code: string) => {
  const { data, error, isLoading } = useGet<GetFundResponse>(`/api/archives/${archiveCode}/${code}`)
 
  return {
    fund: data,
    isLoading,
    isError: error
  }
}

export default useFund;