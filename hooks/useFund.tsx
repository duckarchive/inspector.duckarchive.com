import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { GetFundResponse } from "@/app/api/archives/[archive-code]/[fund-code]/route";

const useFund = (archiveCode: string, code: string) => {
  const { data, error, isLoading } = useSWR<GetFundResponse>(`/api/archives/${archiveCode}/${code}`, fetcher)
 
  return {
    fund: data,
    isLoading,
    isError: error
  }
}

export default useFund;