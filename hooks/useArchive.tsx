import { GetArchiveResponse } from "@/app/api/archives/[archive-code]/route";
import { useGet } from "@/hooks/useApi";

const useArchive = (code: string) => {
  const { data, error, isLoading } = useGet<GetArchiveResponse>(`/api/archives/${code}`);

  return {
    archive: data,
    isLoading,
    isError: error
  }
}

export default useArchive;