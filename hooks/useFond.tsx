import { GetFondResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/route";
import { useGet } from "@/hooks/useApi";

const useFond = (archiveCode: string, code: string) => {
  const { data, error, isLoading } = useGet<GetFondResponse>(`/api/catalog/${archiveCode}/${code}`)

  return {
    fond: data,
    isLoading,
    isError: error
  }
}

export default useFond;
