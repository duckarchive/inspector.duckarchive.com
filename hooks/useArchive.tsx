import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { GetArchiveResponse } from "../app/api/archives/[archive-code]/route";

const useArchive = (code: string) => {
  const { data, error, isLoading } = useSWR<GetArchiveResponse>(`/api/archives/${code}`, fetcher)
 
  return {
    archive: data,
    isLoading,
    isError: error
  }
}

export default useArchive;