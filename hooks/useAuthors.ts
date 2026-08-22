import { useGet } from "@/hooks/useApi";
import { GetAuthorsResponse } from "@/app/api/authors/route";

/** Public author search — any visitor may call it; the editor pickers share it. */
export const useAuthors = (query?: string) =>
  useGet<GetAuthorsResponse>(`/api/authors${query ? `?q=${encodeURIComponent(query)}` : ""}`);
