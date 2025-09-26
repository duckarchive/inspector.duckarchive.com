import useSWR, { SWRConfiguration } from "swr";
import useSWRMutation, { SWRMutationConfiguration } from "swr/mutation";

import { fetcher, postFetcher } from "@/lib/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEFAULT_OPTIONS: SWRConfiguration & SWRMutationConfiguration<any, Error, string, any> = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  keepPreviousData: true,
};

export const useGet = <T>(url: string | null, swrOptions?: SWRConfiguration<T>) => {
  return useSWR<T>(url, fetcher, { ...DEFAULT_OPTIONS, ...swrOptions });
};

export const usePost = <T, R>(url: string, swrOptions?: SWRMutationConfiguration<T, Error, string, R>) => {
  return useSWRMutation<T, Error, string, R>(url, postFetcher, {
    ...DEFAULT_OPTIONS,
    ...swrOptions,
  });
};
