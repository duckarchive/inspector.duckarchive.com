"use client";

import { useState } from "react";
import { addToast } from "@heroui/toast";
import { EditorEntity } from "@/lib/editor-actions";

type Resolution = "execute" | "reject";

const VERB: Record<Resolution, string> = { execute: "Виконано", reject: "Відхилено" };

const useResolveAction = (entity: EditorEntity) => {
  const [isResolving, setIsResolving] = useState(false);

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
    setIsResolving(true);
    let ok = 0;
    const errors: string[] = [];
    for (const id of ids) {
      try {
        await resolveOne(id, resolution);
        ok += 1;
      } catch (error) {
        errors.push((error as Error).message);
      }
    }
    setIsResolving(false);
    if (errors.length === 0) {
      addToast({ title: `${VERB[resolution]}: ${ok}`, color: "success" });
    } else {
      addToast({ title: `${VERB[resolution]}: ${ok}, помилок: ${errors.length}`, description: errors.join("; "), color: "warning" });
    }
    return { ok, errors };
  };

  return { resolveMany, isResolving };
};

export default useResolveAction;
