import useSWRMutation from "swr/mutation";
import { fetcher } from "@/lib/fetcher";
import { SearchRequest, SearchResponse } from "../pages/api/search";

const useSearchRequest = () => {
  const { data, error, trigger, isMutating } = useSWRMutation<SearchResponse, Error, string, SearchRequest>(`/api/search`, (url, { arg }) => fetcher(url, {
    method: 'POST',
    body: JSON.stringify(arg),
    headers: {
      'Content-Type': 'application/json'
    }
  }));

  const isLoading = isMutating;
 
  return {
    searchResults: data,
    isLoading,
    isError: error,
    trigger
  }
}

export default useSearchRequest;