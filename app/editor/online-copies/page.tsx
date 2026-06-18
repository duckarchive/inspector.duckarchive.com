"use client";

import { useState } from "react";
import { Button, ButtonGroup } from "@heroui/button";
import { Chip } from "@heroui/chip";
import InspectorDuckTable from "@/components/table";
import OnlineCopyLinkModal from "@/components/editor/online-copy-link-modal";
import OnlineCopyAddModal from "@/components/editor/online-copy-add-modal";
import useSubmitAction from "@/hooks/useSubmitAction";
import { useEditorOnlineCopies } from "@/hooks/useEditor";
import { EditorOnlineCopy, OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

export default function EditorOnlineCopiesPage() {
  const [target, setTarget] = useState<OnlineCopyTarget>("inventory");
  const { data: copies, isLoading, mutate } = useEditorOnlineCopies(target, true);
  const { submit } = useSubmitAction(target);
  const [selected, setSelected] = useState<EditorOnlineCopy | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleRemove = async (copy: EditorOnlineCopy) => {
    await submit({ type: "remove_online_copy", online_copy_id: copy.id });
    mutate();
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">Онлайн-копії без прив&apos;язки</h1>
        <Button color="primary" onPress={() => setIsAddOpen(true)}>
          Додати онлайн-копію
        </Button>
      </div>

      <ButtonGroup>
        <Button variant={target === "inventory" ? "solid" : "flat"} color={target === "inventory" ? "primary" : "default"} onPress={() => setTarget("inventory")}>
          Описи
        </Button>
        <Button variant={target === "file" ? "solid" : "flat"} color={target === "file" ? "primary" : "default"} onPress={() => setTarget("file")}>
          Справи
        </Button>
      </ButtonGroup>

      <InspectorDuckTable<EditorOnlineCopy>
        id={`editor-online-copies-${target}`}
        isLoading={isLoading}
        rows={copies ?? []}
        columns={[
          { field: "url", headerName: "URL", flex: 8 },
          { field: "availability", headerName: "Доступність", flex: 2 },
          {
            headerName: "",
            flex: 3,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) =>
              row.data.has_pending_action ? (
                <Chip size="sm" color="warning" variant="flat">
                  Очікує дію
                </Chip>
              ) : (
                <div className="flex gap-1">
                  <Button size="sm" color="primary" onPress={() => setSelected(row.data)}>
                    Прив&apos;язати
                  </Button>
                  <Button size="sm" color="danger" variant="flat" onPress={() => handleRemove(row.data)}>
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
