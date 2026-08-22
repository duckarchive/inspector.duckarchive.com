"use client";

import { useState } from "react";
import { Button, Checkbox, Chip, CloseButton, InputGroup, Link, TextField } from "@heroui/react";
import { FaLink, FaTimes } from "react-icons/fa";
import InspectorDuckTable from "@/components/table";
import OnlineCopyLinkModal from "@/components/editor/online-copy-link-modal";
import OnlineCopyAddModal from "@/components/editor/online-copy-add-modal";
import useSubmitAction from "@/hooks/useSubmitAction";
import { useEditorOnlineCopies } from "@/hooks/useEditor";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { EditorOnlineCopy } from "@/app/api/editor/online-copies/data";

export default function EditorOnlineCopiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [unlinkedOnly, setUnlinkedOnly] = useState(true);
  const debouncedQuery = useDebouncedValue(searchQuery.trim());
  const { data: copies, isLoading, mutate } = useEditorOnlineCopies(unlinkedOnly, debouncedQuery || undefined);
  // remove_online_copy doesn't take a target_id, so the entity here only picks
  // which actions table the pending removal lands in — either works
  const { submit } = useSubmitAction("file");
  const [selected, setSelected] = useState<EditorOnlineCopy | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleRemove = async (copy: EditorOnlineCopy) => {
    await submit({ type: "remove_online_copy", online_copy_id: copy.id });
    mutate();
  };

  return (
    <section className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Онлайн-копії без прив&apos;язки</h1>
        <Button onPress={() => setIsAddOpen(true)}>Додати онлайн-копію</Button>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <TextField aria-label="Пошук за URL" value={searchQuery} onChange={setSearchQuery} className="max-w-xs">
          <InputGroup>
            <InputGroup.Input placeholder="Пошук за URL..." />
            {searchQuery ? (
              <InputGroup.Suffix>
                <CloseButton aria-label="Очистити пошук" onPress={() => setSearchQuery("")} />
              </InputGroup.Suffix>
            ) : null}
          </InputGroup>
        </TextField>

        <Checkbox isSelected={unlinkedOnly} onChange={setUnlinkedOnly}>
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
            Лише без прив&apos;язки
          </Checkbox.Content>
        </Checkbox>
      </div>

      <InspectorDuckTable<EditorOnlineCopy>
        id="editor-online-copies"
        isLoading={isLoading}
        rows={copies ?? []}
        columns={[
          {
            field: "url",
            headerName: "URL",
            flex: 6,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) => (
              <Link href={row.data.url} target="_blank" rel="noopener noreferrer" className="text-sm text-wrap">
                {row.data.url}
                <Link.Icon />
              </Link>
            ),
          },
          {
            field: "parsed",
            headerName: "Parsed",
            flex: 3,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) => {
              if (row.data.parsed.includes("+++")) {
                const match = row.data.parsed.match(/^([^+()]+)-\(([^+]+)\+\+\+([^+]+)\+\+\+([^+]+)\)$/);
                if (match) {
                  // eslint-disable-next-line @typescript-eslint/no-unused-vars
                  const [_fullMatch, prefix, p1, p2, p3] = match;
                  return (
                    <div className="flex flex-col gap-1">
                      {[p1, p2, p3].map((part: string, index: number) => (
                        <div key={index} className="text-sm text-wrap">
                          {prefix}-{part}
                        </div>
                      ))}
                    </div>
                  );
                }
              } else {
                return row.data.parsed;
              }
            },
          },
          { field: "availability", headerName: "Доступність", flex: 2 },
          {
            headerName: "",
            flex: 2,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) =>
              row.data.has_pending_action ? (
                <Chip size="sm" color="warning" variant="soft">
                  Очікує дію
                </Chip>
              ) : (
                <div className="flex gap-1">
                  <Button isIconOnly size="sm" aria-label="Прив'язати" onPress={() => setSelected(row.data)}>
                    <FaLink />
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="danger-soft"
                    aria-label="Видалити"
                    onPress={() => handleRemove(row.data)}
                  >
                    <FaTimes />
                  </Button>
                </div>
              ),
          },
        ]}
      />

      <OnlineCopyLinkModal
        copy={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onSubmitted={mutate}
      />
      <OnlineCopyAddModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSubmitted={mutate} />
    </section>
  );
}
