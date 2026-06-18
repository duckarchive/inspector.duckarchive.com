"use client";

import { addToast } from "@heroui/toast";
import { usePost } from "@/hooks/useApi";
import { EditorEntity, SubmitActionBody } from "@/lib/editor-actions";
import { SubmitActionResponse } from "@/app/api/editor/actions/[entity]/route";

const useSubmitAction = (entity: EditorEntity) => {
  const { trigger, isMutating } = usePost<SubmitActionResponse, SubmitActionBody>(`/api/editor/actions/${entity}`);

  const submit = async (body: SubmitActionBody) => {
    try {
      const res = await trigger(body);
      addToast({ title: "Надіслано на розгляд", color: "success" });
      return res;
    } catch (error) {
      addToast({ title: "Помилка", description: (error as Error).message, color: "danger" });
      throw error;
    }
  };

  /** Submit several actions (e.g. a merge) and report a single summary toast. */
  const submitMany = async (bodies: SubmitActionBody[]) => {
    let ok = 0;
    const errors: string[] = [];
    for (const body of bodies) {
      try {
        await trigger(body);
        ok += 1;
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
    if (errors.length === 0) {
      addToast({ title: `Надіслано на розгляд (${ok})`, color: "success" });
    } else {
      addToast({
        title: `Надіслано: ${ok}, помилок: ${errors.length}`,
        description: errors.join("; "),
        color: "warning",
      });
    }
    return { ok, errors };
  };

  return { submit, submitMany, isMutating };
};

export default useSubmitAction;
