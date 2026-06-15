import { GetFileResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/[inventory-code]/[file-code]/route";
import { useGet } from "@/hooks/useApi";

const useFile = (archiveCode: string, fondCode: string, inventoryCode: string, code: string) => {
  const { data, error, isLoading } = useGet<GetFileResponse>(`/api/catalog/${archiveCode}/${fondCode}/${inventoryCode}/${code}`)

  return {
    file: data,
    isLoading,
    isError: error
  }
}

export default useFile;
