import { GetCatalogArchiveResponse } from "@/app/api/catalog/[archive-code]/route";
import { useGet } from "@/hooks/useApi";

const useCatalogArchive = (code: string) => {
  const { data, error, isLoading } = useGet<GetCatalogArchiveResponse>(`/api/catalog/${code}`);

  return {
    archive: data,
    isLoading,
    isError: error
  }
}

export default useCatalogArchive;
