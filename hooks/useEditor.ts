import { useGet } from "@/hooks/useApi";
import { ActionStatus, EditorEntity } from "@/lib/editor-actions";
import { GetEditorFondsResponse } from "@/app/api/editor/catalog/fonds/route";
import { GetEditorInventoriesResponse } from "@/app/api/editor/catalog/inventories/route";
import { GetEditorFilesResponse } from "@/app/api/editor/catalog/files/route";
import { GetEditorAuthorsResponse } from "@/app/api/editor/authors/route";
import { GetAuthorFilesResponse } from "@/app/api/editor/authors/[id]/route";
import { GetEditorOnlineCopiesResponse } from "@/app/api/editor/online-copies/route";
import { ListActionsResponse } from "@/app/api/editor/actions/[entity]/route";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

export const useEditorFonds = (archiveCode?: string) =>
  useGet<GetEditorFondsResponse>(archiveCode ? `/api/editor/catalog/fonds?archive=${encodeURIComponent(archiveCode)}` : null);

export const useEditorInventories = (fondId?: string) =>
  useGet<GetEditorInventoriesResponse>(fondId ? `/api/editor/catalog/inventories?fond=${fondId}` : null);

export const useEditorFiles = (inventoryId?: string) =>
  useGet<GetEditorFilesResponse>(inventoryId ? `/api/editor/catalog/files?inventory=${inventoryId}` : null);

export const useEditorAuthors = (query?: string) =>
  useGet<GetEditorAuthorsResponse>(`/api/editor/authors${query ? `?q=${encodeURIComponent(query)}` : ""}`);

export const useAuthorFiles = (authorId?: string) =>
  useGet<GetAuthorFilesResponse>(authorId ? `/api/editor/authors/${authorId}` : null);

export const useEditorOnlineCopies = (target: OnlineCopyTarget, unlinkedOnly = true) =>
  useGet<GetEditorOnlineCopiesResponse>(`/api/editor/online-copies?target=${target}&unlinked=${unlinkedOnly}`);

export const useEditorActions = (
  entity: EditorEntity,
  filters?: { status?: ActionStatus; type?: string; target_id?: string },
) => {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (filters?.type) params.set("type", filters.type);
  if (filters?.target_id) params.set("target_id", filters.target_id);
  const qs = params.toString();
  return useGet<ListActionsResponse>(`/api/editor/actions/${entity}${qs ? `?${qs}` : ""}`);
};
