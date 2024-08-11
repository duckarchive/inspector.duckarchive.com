import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const useArchive = (code: string) => {
  const { data, error, isLoading } = useSWR(`/api/archives/${code}`, fetcher)
 
  return {
    archive: data,
    isLoading,
    isError: error
  }
}

export default useArchive;