"use client";

import { useState } from "react";
import { addToast } from "@heroui/toast";
import { EditorEntity } from "@/lib/editor-actions";

type Resolution = "execute" | "reject";

const VERB: Record<Resolution, string> = { execute: "Виконано", reject: "Відхилено" };

interface BatchResolveResponse {
  resolved: number;
  errors: Array<{ id: string; message: string }>;
}

const useResolveAction = (entity: EditorEntity) => {
  const [isResolving, setIsResolving] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);

  const resolveOne = async (id: string, resolution: Resolution) => {
    const res = await fetch(`/api/editor/actions/${entity}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolution }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || `PATCH failed with status ${res.status}`);
    }
    return res.json();
  };

  const resolveMany = async (ids: string[], resolution: Resolution) => {
    // Use batch endpoint for large operations, fallback to individual for small batches
    if (ids.length > 10) {
      setIsBatchLoading(true);
    } else {
      setIsResolving(true);
    }
    try {
      const response =
        ids.length > 10
          ? await resolveBatch(ids, resolution)
          : await resolveIndividual(ids, resolution);

      const errorSummary = response.errors.slice(0, 3).map((e) => e.message).join("; ");
      if (response.errors.length === 0) {
        addToast({ title: `${VERB[resolution]}: ${response.ok}`, color: "success" });
      } else {
        addToast({
          title: `${VERB[resolution]}: ${response.ok}, помилок: ${response.errors.length}`,
          description: response.errors.length > 3 ? `${errorSummary}...` : errorSummary,
          color: "warning",
        });
      }
      return response;
    } finally {
      setIsResolving(false);
      setIsBatchLoading(false);
    }
  };

  const resolveIndividual = async (ids: string[], resolution: Resolution) => {
    let ok = 0;
    const errors: Array<{ id: string; message: string }> = [];
    for (const id of ids) {
      try {
        await resolveOne(id, resolution);
        ok += 1;
      } catch (error) {
        errors.push({ id, message: (error as Error).message });
      }
    }
    return { ok, errors };
  };

  const resolveBatch = async (ids: string[], resolution: Resolution) => {
    const res = await fetch(`/api/editor/actions/${entity}/batch-resolve`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ids.map((id) => ({ id, resolution }))),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.message || `Batch resolve failed with status ${res.status}`);
    }

    return (await res.json()) as BatchResolveResponse & { ok?: number };
  };

  return { resolveMany, isResolving: isResolving || isBatchLoading };
};

export default useResolveAction;
