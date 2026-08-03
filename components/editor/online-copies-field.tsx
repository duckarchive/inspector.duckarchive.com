"use client";

import { Key, useMemo, useRef, useState } from "react";
import { Button, Chip, CloseButton } from "@heroui/react";
import Select from "@/components/select";
import { useEditorOnlineCopies } from "@/hooks/useEditor";

export interface OnlineCopyOps {
  /** existing unlinked copy ids to link to this instance */
  connect: string[];
  /** linked copy ids to unlink from this instance */
  disconnect: string[];
}

export const emptyOnlineCopyOps = (): OnlineCopyOps => ({ connect: [], disconnect: [] });

interface ExistingCopy {
  id: string;
  url: string;
}

interface OnlineCopiesFieldProps {
  copies: ExistingCopy[];
  ops: OnlineCopyOps;
  onChange: (ops: OnlineCopyOps) => void;
}

const toggle = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

const OnlineCopiesField: React.FC<OnlineCopiesFieldProps> = ({ copies, ops, onChange }) => {
  const [query, setQuery] = useState("");
  const { data: unlinked, isLoading } = useEditorOnlineCopies(false, query || undefined);

  // accumulate labels across queries so already-picked chips survive a new search
  const labelCache = useRef(new Map<string, string>());
  const labelById = useMemo(() => {
    unlinked?.forEach((c) => labelCache.current.set(c.id, c.parsed || c.url));
    return labelCache.current;
  }, [unlinked]);

  const connect = (key: Key | null) => {
    const id = String(key ?? "");
    if (id && !ops.connect.includes(id)) {
      onChange({ ...ops, connect: [...ops.connect, id] });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">Онлайн-копії</span>
      <ul className="flex flex-col gap-1">
        {copies.length === 0 && <span className="text-muted text-sm">Немає прив&apos;язаних</span>}
        {copies.map((c) => {
          const disconnected = ops.disconnect.includes(c.id);
          return (
            <li key={c.id} className="flex items-center gap-2">
              <span className={`text-sm truncate flex-1 ${disconnected ? "line-through opacity-50" : ""}`}>{c.url}</span>
              <Button size="sm" variant={disconnected ? "primary" : "tertiary"} onPress={() => onChange({ ...ops, disconnect: toggle(ops.disconnect, c.id) })}>
                Відв&apos;язати
              </Button>
            </li>
          );
        })}
      </ul>
      {ops.connect.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ops.connect.map((id) => (
            <Chip key={id} color="success" variant="soft" className="h-auto max-w-full py-1">
              <Chip.Label className="whitespace-normal break-all">{labelById.get(id) ?? id}</Chip.Label>
              <CloseButton
                aria-label="Скасувати прив'язку"
                onPress={() => onChange({ ...ops, connect: ops.connect.filter((x) => x !== id) })}
              />
            </Chip>
          ))}
        </div>
      )}
      <Select
        label="Прив'язати наявну онлайн-копію (пошук по коду або url)"
        wrapUrls
        items={unlinked ?? []}
        getKey={(c) => c.id}
        getTextValue={(c) => `${c.parsed} ${c.url}`}
        renderItem={(c) => (
          <div className="flex flex-col">
            {c.parsed && <span className="line-clamp-1">{c.parsed}</span>}
            <span className={`line-clamp-1 ${c.parsed ? "text-xs text-muted" : ""}`}>{c.url}</span>
          </div>
        )}
        inputValue={query}
        onInputChange={setQuery}
        onChange={connect}
      />
      {isLoading && <span className="text-xs text-muted">Пошук…</span>}
    </div>
  );
};

export default OnlineCopiesField;
