"use client";

import { usePost } from "@/hooks/useApi";
import { EditorEntity, SubmitActionBody } from "@/lib/editor-actions";
import { SubmitActionResponse } from "@/app/api/editor/actions/[entity]/route";

/**
 * Raw POST of a single `report` action. Deliberately not `useSubmitAction` —
 * that hook toasts hardcoded Ukrainian, and the wizard is localized.
 */
const useSubmitReport = (entity: EditorEntity) => {
  const { trigger, isMutating } = usePost<SubmitActionResponse, SubmitActionBody>(`/api/editor/actions/${entity}`);
  return { trigger, isMutating };
};

export default useSubmitReport;
