import useSWRMutation from "swr/mutation";
import { postFetcher } from "@/lib/api";
import { SearchRequest, SearchResponse } from "@/app/api/search/old.route";

const useSearchRequest = () => {
  const { data, error, trigger, isMutating } = useSWRMutation<SearchResponse, Error, string, SearchRequest>(
    `/api/search`,
    postFetcher
  );

  const isLoading = isMutating;

  return {
    searchResults: data,
    isLoading,
    isError: error,
    trigger,
  };
};

export default useSearchRequest;
