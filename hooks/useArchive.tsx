import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { GetArchiveResponse } from "../pages/api/archives/[archive-code]";

const useArchive = (code: string) => {
  const { data, error, isLoading } = useSWR<GetArchiveResponse>(`/api/archives/${code}`, fetcher)
 
  return {
    archive: data,
    isLoading,
    isError: error
  }
}

export default useArchive;