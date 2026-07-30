"use client";

import { Key, useMemo, useState } from "react";
import { Button, Chip, CloseButton, Input, Label, TextField } from "@heroui/react";
import Select from "@/components/select";
import { useEditorAuthors } from "@/hooks/useEditor";

export interface AuthorOps {
  /** author ids to unlink from the file */
  disconnect: string[];
  /** existing author ids to link */
  connect: string[];
  /** titles of brand-new authors to create + link */
  addNew: string[];
}

export const emptyAuthorOps = (): AuthorOps => ({ disconnect: [], connect: [], addNew: [] });

interface LinkedAuthor {
  id: string;
  title: string;
}

interface AuthorsFieldProps {
  linked: LinkedAuthor[];
  ops: AuthorOps;
  onChange: (ops: AuthorOps) => void;
}

const AuthorsField: React.FC<AuthorsFieldProps> = ({ linked, ops, onChange }) => {
  const [query, setQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const { data: authors } = useEditorAuthors(query || undefined);

  const titleById = useMemo(() => {
    const map = new Map<string, string>();
    linked.forEach((a) => map.set(a.id, a.title));
    authors?.forEach((a) => map.set(a.id, a.title));
    return map;
  }, [linked, authors]);

  const toggleDisconnect = (id: string) =>
    onChange({ ...ops, disconnect: ops.disconnect.includes(id) ? ops.disconnect.filter((x) => x !== id) : [...ops.disconnect, id] });

  const connect = (key: Key | null) => {
    const id = String(key ?? "");
    if (id && !ops.connect.includes(id) && !linked.some((a) => a.id === id)) {
      onChange({ ...ops, connect: [...ops.connect, id] });
    }
  };

  const addNew = () => {
    const trimmed = newTitle.trim();
    if (trimmed && !ops.addNew.includes(trimmed)) {
      onChange({ ...ops, addNew: [...ops.addNew, trimmed] });
      setNewTitle("");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">Автори</span>
      <div className="flex flex-wrap gap-1">
        {linked.length === 0 && ops.connect.length === 0 && ops.addNew.length === 0 && (
          <span className="text-muted text-sm">Немає</span>
        )}
        {linked.map((a) => (
          <Chip
            key={a.id}
            variant={ops.disconnect.includes(a.id) ? "primary" : "soft"}
            color={ops.disconnect.includes(a.id) ? "danger" : "default"}
          >
            {a.title}
            <CloseButton aria-label="Відв'язати автора" onPress={() => toggleDisconnect(a.id)} />
          </Chip>
        ))}
        {ops.connect.map((id) => (
          <Chip key={id} color="success" variant="soft">
            {titleById.get(id) ?? id}
            <CloseButton
              aria-label="Скасувати прив'язку автора"
              onPress={() => onChange({ ...ops, connect: ops.connect.filter((x) => x !== id) })}
            />
          </Chip>
        ))}
        {ops.addNew.map((t, i) => (
          <Chip key={t} color="success" variant="secondary">
            {t}
            <CloseButton
              aria-label="Скасувати нового автора"
              onPress={() => onChange({ ...ops, addNew: ops.addNew.filter((_, idx) => idx !== i) })}
            />
          </Chip>
        ))}
      </div>
      <Select
        label="Прив'язати існуючого автора"
        virtualized
        items={authors ?? []}
        getKey={(a) => a.id}
        getTextValue={(a) => a.title}
        renderItem={(a) => a.title}
        inputValue={query}
        onInputChange={setQuery}
        onChange={connect}
      />
      <div className="flex items-end gap-2">
        <TextField value={newTitle} onChange={setNewTitle}>
          <Label>Додати нового автора</Label>
          <Input />
        </TextField>
        <Button size="sm" onPress={addNew} isDisabled={!newTitle.trim()}>
          Додати
        </Button>
      </div>
    </div>
  );
};

export default AuthorsField;
