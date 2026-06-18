"use client";

import { Key, useMemo, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Chip } from "@heroui/chip";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { useEditorAuthors } from "@/hooks/useEditor";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";

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
      <span className="text-sm text-default-600">Автори</span>
      <div className="flex flex-wrap gap-1">
        {linked.length === 0 && ops.connect.length === 0 && ops.addNew.length === 0 && (
          <span className="text-default-400 text-sm">Немає</span>
        )}
        {linked.map((a) => (
          <Chip
            key={a.id}
            variant={ops.disconnect.includes(a.id) ? "solid" : "flat"}
            color={ops.disconnect.includes(a.id) ? "danger" : "default"}
            onClose={() => toggleDisconnect(a.id)}
          >
            {a.title}
          </Chip>
        ))}
        {ops.connect.map((id) => (
          <Chip key={id} color="success" onClose={() => onChange({ ...ops, connect: ops.connect.filter((x) => x !== id) })}>
            {titleById.get(id) ?? id}
          </Chip>
        ))}
        {ops.addNew.map((t, i) => (
          <Chip key={t} color="success" variant="dot" onClose={() => onChange({ ...ops, addNew: ops.addNew.filter((_, idx) => idx !== i) })}>
            {t}
          </Chip>
        ))}
      </div>
      <Autocomplete
        size="sm"
        label="Прив'язати існуючого автора"
        inputValue={query}
        onInputChange={setQuery}
        onSelectionChange={connect}
        items={authors ?? []}
        {...editorAutocompleteVirtualization}
      >
        {(a) => (
          <AutocompleteItem key={a.id} textValue={a.title} classNames={wrapItemClassNames}>
            {a.title}
          </AutocompleteItem>
        )}
      </Autocomplete>
      <div className="flex items-end gap-2">
        <Input size="sm" label="Додати нового автора" value={newTitle} onValueChange={setNewTitle} />
        <Button size="sm" onPress={addNew} isDisabled={!newTitle.trim()}>
          Додати
        </Button>
      </div>
    </div>
  );
};

export default AuthorsField;
