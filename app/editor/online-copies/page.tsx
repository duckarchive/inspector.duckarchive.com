"use client";

import { useMemo, useState } from "react";
import { Button, ButtonGroup, Chip, CloseButton, InputGroup, TextField } from "@heroui/react";
import InspectorDuckTable from "@/components/table";
import OnlineCopyLinkModal from "@/components/editor/online-copy-link-modal";
import OnlineCopyAddModal from "@/components/editor/online-copy-add-modal";
import useSubmitAction from "@/hooks/useSubmitAction";
import { useEditorOnlineCopies } from "@/hooks/useEditor";
import { EditorOnlineCopy, OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

export default function EditorOnlineCopiesPage() {
  const [target, setTarget] = useState<OnlineCopyTarget>("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const { data: copies, isLoading, mutate } = useEditorOnlineCopies(target, true);
  const { submit } = useSubmitAction(target);
  const [selected, setSelected] = useState<EditorOnlineCopy | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const filteredCopies = useMemo(() => {
    if (!copies) return [];
    if (!searchQuery.trim()) return copies;
    const query = searchQuery.toLowerCase();
    return copies.filter((copy) => copy.url.toLowerCase().includes(query));
  }, [copies, searchQuery]);

  const handleRemove = async (copy: EditorOnlineCopy) => {
    await submit({ type: "remove_online_copy", online_copy_id: copy.id });
    mutate();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Онлайн-копії без прив&apos;язки</h1>
        <Button onPress={() => setIsAddOpen(true)}>
          Додати онлайн-копію
        </Button>
      </div>

      <ButtonGroup>
        <Button variant={target === "inventory" ? "primary" : "tertiary"} onPress={() => setTarget("inventory")}>
          Описи
        </Button>
        <Button variant={target === "file" ? "primary" : "tertiary"} onPress={() => setTarget("file")}>
          Справи
        </Button>
      </ButtonGroup>

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

      <InspectorDuckTable<EditorOnlineCopy>
        id={`editor-online-copies-${target}`}
        isLoading={isLoading}
        rows={filteredCopies}
        columns={[
          { field: "url", headerName: "URL", flex: 8 },
          { field: "availability", headerName: "Доступність", flex: 2 },
          {
            headerName: "",
            flex: 3,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) =>
              row.data.has_pending_action ? (
                <Chip size="sm" color="warning" variant="soft">
                  Очікує дію
                </Chip>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" onPress={() => setSelected(row.data)}>
                    Прив&apos;язати
                  </Button>
                  <Button size="sm" variant="danger-soft" onPress={() => handleRemove(row.data)}>
                    Видалити
                  </Button>
                </div>
              ),
          },
        ]}
      />

      <OnlineCopyLinkModal
        copy={selected}
        target={target}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onSubmitted={mutate}
      />
      <OnlineCopyAddModal target={target} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSubmitted={mutate} />
    </section>
  );
}
