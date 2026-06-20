"use client";

import { Key, useState } from "react";
import InspectorDuckTable from "@/components/table";
import Select from "@/components/select";
import EditCell from "@/components/editor/edit-cell";
import FileEditModal from "@/components/editor/file-edit-modal";
import FileAddModal from "@/components/editor/file-add-modal";
import { useGet } from "@/hooks/useApi";
import { useEditorFiles, useEditorFonds, useEditorInventories } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";
import { sortByCode } from "@/lib/table";
import { Button } from "@heroui/button";

export default function EditorFilesPage() {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState("");
  const [fondId, setFondId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const { data: fonds } = useEditorFonds(archiveCode || undefined);
  const { data: inventories } = useEditorInventories(fondId || undefined);
  const { data: files, isLoading, mutate } = useEditorFiles(inventoryId || undefined);
  const [selected, setSelected] = useState<EditorFile | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const selectedInventory = inventories?.find((i) => i.id === inventoryId) as EditorInventory | undefined;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Справи</h1>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 grow">
          <Select
            size="sm"
            items={(archives ?? []).sort((a, b) => a.code.localeCompare(b.code))}
            label="Архів"
            getKey={(a) => a.code}
            getTextValue={(a) => a.code}
            renderItem={(a) => (
              <div>
                <p>{a.code}</p>
                <p className="opacity-70 text-sm text-wrap">{a.title}</p>
              </div>
            )}
            value={archiveCode}
            onChange={(key: Key | null) => {
              setArchiveCode(String(key ?? ""));
              setFondId("");
              setInventoryId("");
            }}
          />
          <Select
            size="sm"
            items={(fonds ?? []).sort(sortByCode)}
            label="Фонд"
            virtualized
            isDisabled={!archiveCode}
            getKey={(f) => f.id}
            getTextValue={(f) => `${f.code} ${f.title ?? ""}`}
            renderItem={(f) => (
              <div>
                <p>{f.code}</p>
                <p className="opacity-70 text-sm text-wrap">{f.title}</p>
              </div>
            )}
            value={fondId}
            onChange={(key: Key | null) => {
              setFondId(String(key ?? ""));
              setInventoryId("");
            }}
          />
          <Select
            size="sm"
            items={(inventories ?? []).sort(sortByCode)}
            label="Опис"
            virtualized
            isDisabled={!fondId}
            getKey={(inv) => inv.id}
            getTextValue={(inv) => `${inv.code} ${inv.title ?? ""}`}
            renderItem={(inv) => (
              <div>
                <p>{inv.code}</p>
                <p className="opacity-70 text-sm text-wrap">{inv.title}</p>
              </div>
            )}
            value={inventoryId}
            onChange={(key: Key | null) => setInventoryId(String(key ?? ""))}
          />
        </div>
        <Button color="success" variant="ghost" size="lg" onPress={() => setIsAddOpen(true)} isDisabled={!inventoryId}>
          Створити
        </Button>
      </div>

      <InspectorDuckTable<EditorFile>
        id="editor-files-table"
        isLoading={isLoading}
        rows={files ?? []}
        columns={[
          { field: "code", headerName: "Код" },
          { field: "title", headerName: "Назва", flex: 5 },
          {
            headerName: "Автори",
            flex: 3,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valueGetter: (p: any) =>
              (p.data?.authors ?? []).map((a: { author: { title: string } }) => a.author.title).join(", "),
          },
          {
            headerName: "Копії",
            flex: 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valueGetter: (p: any) => (p.data?.online_copies ?? []).length,
          },
          {
            headerName: "",
            flex: 2,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) => (
              <EditCell hasPending={row.data.has_pending_action} onEdit={() => setSelected(row.data)} />
            ),
          },
        ]}
      />

      <FileEditModal
        file={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onSubmitted={mutate}
      />
      <FileAddModal inventory={selectedInventory ?? null} isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} onSubmitted={mutate} />
    </section>
  );
}
