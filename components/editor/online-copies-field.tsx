"use client";

import { Key, useMemo } from "react";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import Select from "@/components/select";
import { useEditorOnlineCopies } from "@/hooks/useEditor";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

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
  target: OnlineCopyTarget;
  ops: OnlineCopyOps;
  onChange: (ops: OnlineCopyOps) => void;
}

const toggle = (list: string[], id: string): string[] =>
  list.includes(id) ? list.filter((x) => x !== id) : [...list, id];

const OnlineCopiesField: React.FC<OnlineCopiesFieldProps> = ({ copies, target, ops, onChange }) => {
  const { data: unlinked } = useEditorOnlineCopies(target, true);

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    unlinked?.forEach((c) => map.set(c.id, c.parsed || c.url));
    return map;
  }, [unlinked]);

  const connect = (key: Key | null) => {
    const id = String(key ?? "");
    if (id && !ops.connect.includes(id)) {
      onChange({ ...ops, connect: [...ops.connect, id] });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-default-600">Онлайн-копії</span>
      <ul className="flex flex-col gap-1">
        {copies.length === 0 && <span className="text-default-400 text-sm">Немає прив&apos;язаних</span>}
        {copies.map((c) => {
          const disconnected = ops.disconnect.includes(c.id);
          return (
            <li key={c.id} className="flex items-center gap-2">
              <span className={`text-sm truncate flex-1 ${disconnected ? "line-through opacity-50" : ""}`}>{c.url}</span>
              <Button size="sm" variant={disconnected ? "solid" : "flat"} onPress={() => onChange({ ...ops, disconnect: toggle(ops.disconnect, c.id) })}>
                Відв&apos;язати
              </Button>
            </li>
          );
        })}
      </ul>
      {ops.connect.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ops.connect.map((id) => (
            <Chip
              key={id}
              color="success"
              onClose={() => onChange({ ...ops, connect: ops.connect.filter((x) => x !== id) })}
              classNames={{ base: "h-auto max-w-full py-1", content: "whitespace-normal break-all" }}
            >
              {labelById.get(id) ?? id}
            </Chip>
          ))}
        </div>
      )}
      <Select
        label="Прив'язати наявну онлайн-копію"
        wrapUrls
        items={unlinked ?? []}
        getKey={(c) => c.id}
        getTextValue={(c) => `${c.parsed} ${c.url}`}
        renderItem={(c) => (
          <div className="flex flex-col">
            {c.parsed && <span className="line-clamp-1">{c.parsed}</span>}
            <span className={`line-clamp-1 ${c.parsed ? "text-tiny text-default-400" : ""}`}>{c.url}</span>
          </div>
        )}
        onChange={connect}
      />
    </div>
  );
};

export default OnlineCopiesField;
