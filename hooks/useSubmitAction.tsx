"use client";

import { useState } from "react";
import { addToast } from "@heroui/toast";
import { usePost } from "@/hooks/useApi";
import { EditorEntity, SubmitActionBody } from "@/lib/editor-actions";
import { SubmitActionResponse } from "@/app/api/editor/actions/[entity]/route";

const useSubmitAction = (entity: EditorEntity) => {
  const { trigger, isMutating: isSubmitting } = usePost<SubmitActionResponse, SubmitActionBody>(`/api/editor/actions/${entity}`);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const isMutating = isSubmitting || isBatchLoading;

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

  /** Batch submit actions in a single request (efficient for large operations like merges). */
  const submitBatch = async (bodies: SubmitActionBody[]) => {
    setIsBatchLoading(true);
    try {
      const res = await fetch(`/api/editor/actions/${entity}/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodies),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Batch submission failed");
      }

      const result = (await res.json()) as { created: number; errors: Array<{ index: number; message: string }> };
      const totalErrors = result.errors.length;

      if (totalErrors === 0) {
        addToast({ title: `Надіслано на розгляд (${result.created})`, color: "success" });
      } else {
        const errorSummary = result.errors.slice(0, 3).map((e) => `[${e.index}] ${e.message}`).join("; ");
        addToast({
          title: `Надіслано: ${result.created}, помилок: ${totalErrors}`,
          description: totalErrors > 3 ? `${errorSummary}...` : errorSummary,
          color: "warning",
        });
      }
      return result;
    } catch (error) {
      addToast({ title: "Помилка", description: (error as Error).message, color: "danger" });
      throw error;
    } finally {
      setIsBatchLoading(false);
    }
  };

  return { submit, submitMany, submitBatch, isMutating };
};

export default useSubmitAction;
