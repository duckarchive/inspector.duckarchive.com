"use client";

import { useMemo, useState } from "react";
import { Button, ButtonGroup } from "@heroui/button";
import { Checkbox } from "@heroui/checkbox";
import { Chip } from "@heroui/chip";
import { useEditorActions } from "@/hooks/useEditor";
import useResolveAction from "@/hooks/useResolveAction";
import {
  ACTION_STATUS_LABELS,
  ACTION_TYPE_LABELS,
  ActionStatus,
  decodeNote,
  EditorEntity,
} from "@/lib/editor-actions";
import { ActionType } from "@generated/prisma/client/client";

interface ActionsTableProps {
  entity: EditorEntity;
  title: string;
}

const STATUSES: (ActionStatus | "all")[] = ["pending", "executed", "rejected", "all"];
const STATUS_FILTER_LABELS: Record<ActionStatus | "all", string> = {
  pending: "Очікують",
  executed: "Виконані",
  rejected: "Відхилені",
  all: "Усі",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const targetLabel = (data: any): string =>
  data?.fond?.code ?? data?.inventory?.code ?? data?.file?.full_code ?? data?.file?.code ?? "—";

const noteLabel = (note: string | null): string => {
  const decoded = decodeNote(note);
  if (!decoded) return "";
  if ("raw" in decoded) return decoded.raw;
  const parts: string[] = [];
  if (decoded.field) parts.push(decoded.field);
  if (decoded.value !== undefined) parts.push(typeof decoded.value === "object" ? JSON.stringify(decoded.value) : String(decoded.value));
  if (decoded.author_id) parts.push(`автор=${decoded.author_id.slice(0, 8)}`);
  return parts.join(": ");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPending = (data: any): boolean => !data?.resolved_at;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statusChip = (data: any) => {
  if (isPending(data)) return <Chip size="sm" color="warning" variant="flat">{ACTION_STATUS_LABELS.pending}</Chip>;
  if (data.is_rejected) return <Chip size="sm" color="danger" variant="flat">{ACTION_STATUS_LABELS.rejected}</Chip>;
  return <Chip size="sm" color="success" variant="flat">{ACTION_STATUS_LABELS.executed}</Chip>;
};

const ActionsTable: React.FC<ActionsTableProps> = ({ entity, title }) => {
  const [status, setStatus] = useState<ActionStatus | "all">("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data: actions, isLoading, mutate } = useEditorActions(entity, status === "all" ? undefined : { status });
  const { resolveMany, isResolving } = useResolveAction(entity);

  const rows = useMemo(() => actions ?? [], [actions]);
  const pendingIds = useMemo(() => rows.filter(isPending).map((r) => r.id), [rows]);
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const setStatusAndReset = (s: ActionStatus | "all") => {
    setStatus(s);
    setSelected(new Set());
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pendingIds));
  };

  const resolve = async (ids: string[], resolution: "execute" | "reject") => {
    if (ids.length === 0) return;
    await resolveMany(ids, resolution);
    setSelected(new Set());
    mutate();
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <ButtonGroup size="sm">
            {STATUSES.map((s) => (
              <Button key={s} variant={status === s ? "solid" : "flat"} color={status === s ? "primary" : "default"} onPress={() => setStatusAndReset(s)}>
                {STATUS_FILTER_LABELS[s]}
              </Button>
            ))}
          </ButtonGroup>
          <Button size="sm" color="success" isDisabled={selectedIds.length === 0} isLoading={isResolving} onPress={() => resolve(selectedIds, "execute")}>
            Виконати обрані ({selectedIds.length})
          </Button>
          <Button size="sm" color="danger" variant="flat" isDisabled={selectedIds.length === 0} isLoading={isResolving} onPress={() => resolve(selectedIds, "reject")}>
            Відхилити обрані ({selectedIds.length})
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto border border-default-200 rounded-medium">
        <table className="w-full text-sm">
          <thead className="bg-default-100">
            <tr className="text-left">
              <th className="p-2 w-10">
                <Checkbox isSelected={allSelected} isDisabled={pendingIds.length === 0} onValueChange={toggleAll} aria-label="Обрати всі" />
              </th>
              <th className="p-2">Дія</th>
              <th className="p-2">Ціль</th>
              <th className="p-2">Деталі</th>
              <th className="p-2">Статус</th>
              <th className="p-2 text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-default-400">Завантаження…</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-default-400">Немає дій</td>
              </tr>
            )}
            {rows.map((row) => {
              const pending = isPending(row);
              return (
                <tr key={row.id} className="border-t border-default-100 align-top">
                  <td className="p-2">
                    {pending && <Checkbox isSelected={selected.has(row.id)} onValueChange={() => toggle(row.id)} aria-label="Обрати" />}
                  </td>
                  <td className="p-2">{ACTION_TYPE_LABELS[row.type as ActionType] ?? row.type}</td>
                  <td className="p-2">{targetLabel(row)}</td>
                  <td className="p-2 max-w-xs break-words">{noteLabel(row.note)}</td>
                  <td className="p-2">{statusChip(row)}</td>
                  <td className="p-2">
                    {pending && (
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" color="success" isLoading={isResolving} onPress={() => resolve([row.id], "execute")}>
                          Виконати
                        </Button>
                        <Button size="sm" color="danger" variant="flat" isLoading={isResolving} onPress={() => resolve([row.id], "reject")}>
                          Відхилити
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActionsTable;
