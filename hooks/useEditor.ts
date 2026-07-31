import { useGet } from "@/hooks/useApi";
import { ActionStatus, EditorQueue } from "@/lib/editor-actions";
import { GetEditorFondsResponse } from "@/app/api/editor/catalog/fonds/route";
import { GetEditorInventoriesResponse } from "@/app/api/editor/catalog/inventories/route";
import { GetEditorFilesResponse } from "@/app/api/editor/catalog/files/route";
import { GetEditorAuthorsResponse } from "@/app/api/editor/authors/route";
import { GetAuthorFilesResponse } from "@/app/api/editor/authors/[id]/route";
import { GetEditorOnlineCopiesResponse } from "@/app/api/editor/online-copies/route";
import { ListActionsResponse } from "@/app/api/editor/actions/[entity]/route";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

/**
 * Endpoint builders for the searchable pickers (`useCatalogPicker` adds `q`,
 * `limit`/`offset` and `id` on top). They return `null` while the parent
 * selection is empty so nothing is fetched.
 */
export const editorFondsEndpoint = (archiveCode?: string) =>
  archiveCode ? `/api/editor/catalog/fonds?archive=${encodeURIComponent(archiveCode)}` : null;

export const editorInventoriesEndpoint = (fondId?: string) =>
  fondId ? `/api/editor/catalog/inventories?fond=${encodeURIComponent(fondId)}` : null;

export const editorFilesEndpoint = (inventoryId?: string) =>
  inventoryId ? `/api/editor/catalog/files?inventory=${encodeURIComponent(inventoryId)}` : null;

/** Unpaged fetches backing the catalog grids, which page client-side. */
export const useEditorFonds = (archiveCode?: string) =>
  useGet<GetEditorFondsResponse>(editorFondsEndpoint(archiveCode));

export const useEditorInventories = (fondId?: string) =>
  useGet<GetEditorInventoriesResponse>(editorInventoriesEndpoint(fondId));

export const useEditorFiles = (inventoryId?: string) =>
  useGet<GetEditorFilesResponse>(editorFilesEndpoint(inventoryId));

export const useEditorAuthors = (query?: string) =>
  useGet<GetEditorAuthorsResponse>(`/api/editor/authors${query ? `?q=${encodeURIComponent(query)}` : ""}`);

export const useAuthorFiles = (authorId?: string) =>
  useGet<GetAuthorFilesResponse>(authorId ? `/api/editor/authors/${authorId}` : null);

export const useEditorOnlineCopies = (target: OnlineCopyTarget, unlinkedOnly = true, query?: string) =>
  useGet<GetEditorOnlineCopiesResponse>(
    `/api/editor/online-copies?target=${target}&unlinked=${unlinkedOnly}${query ? `&q=${encodeURIComponent(query)}` : ""}`,
  );

export const useEditorActions = (
  entity: EditorQueue,
  filters?: { status?: ActionStatus; type?: string; target_id?: string },
) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.target_id) params.set("target_id", filters.target_id);
  const qs = params.toString();
  return useGet<ListActionsResponse>(`/api/editor/actions/${entity}${qs ? `?${qs}` : ""}`);
};
