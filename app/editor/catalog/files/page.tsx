"use client";

import { Key, useEffect, useState } from "react";
import InspectorDuckTable from "@/components/table";
import Select from "@/components/select";
import CatalogSelect from "@/components/editor/catalog-select";
import CatalogItemLink from "@/components/editor/catalog-item-link";
import EditCell from "@/components/editor/edit-cell";
import FileEditModal from "@/components/editor/file-edit-modal";
import FileAddModal from "@/components/editor/file-add-modal";
import { useGet } from "@/hooks/useApi";
import { useCatalogPicker } from "@/hooks/useCatalogPicker";
import { editorFondsEndpoint, editorInventoriesEndpoint, useEditorFiles } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";
import { syncEditorUrl } from "@/lib/editor-url";
import { Button } from "@heroui/react";

export default function EditorFilesPage() {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState("");
  const [fondId, setFondId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const fondPicker = useCatalogPicker<EditorFond>(editorFondsEndpoint(archiveCode), fondId);
  const inventoryPicker = useCatalogPicker<EditorInventory>(editorInventoriesEndpoint(fondId), inventoryId);
  const { data: files, isLoading, mutate } = useEditorFiles(inventoryId || undefined);
  const [selected, setSelected] = useState<EditorFile | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<string | null>(null);

  // deep link from the actions dashboard: ?archive=…&fond=…&inventory=…&edit=<file_id>
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("archive")) setArchiveCode(params.get("archive") as string);
    if (params.get("fond")) setFondId(params.get("fond") as string);
    if (params.get("inventory")) setInventoryId(params.get("inventory") as string);
    if (params.get("edit")) setPendingEditId(params.get("edit"));
  }, []);

  useEffect(() => {
    if (!pendingEditId || !files) return;
    const file = files.find((f) => f.id === pendingEditId);
    if (file) {
      setSelected(file);
      setPendingEditId(null);
    }
  }, [pendingEditId, files]);

  const selectedInventory = inventoryPicker.selected;

  return (
    <section className="flex flex-col gap-4 h-full">
      <h1 className="text-2xl font-bold">Справи</h1>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 grow">
          <Select
            className="grow"
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
              const v = String(key ?? "");
              setArchiveCode(v);
              setFondId("");
              setInventoryId("");
              syncEditorUrl({ archive: v || null, fond: null, inventory: null, edit: null });
            }}
          />
          <CatalogSelect
            className="grow"
            picker={fondPicker}
            label="Фонд"
            isDisabled={!archiveCode}
            value={fondId}
            onChange={(id) => {
              setFondId(id);
              setInventoryId("");
              syncEditorUrl({ fond: id || null, inventory: null, edit: null });
            }}
          />
          <CatalogSelect
            className="grow"
            picker={inventoryPicker}
            label="Опис"
            isDisabled={!fondId}
            value={inventoryId}
            onChange={(id) => {
              setInventoryId(id);
              syncEditorUrl({ inventory: id || null, edit: null });
            }}
          />
        </div>
        <Button variant="ghost" size="lg" onPress={() => setIsAddOpen(true)} isDisabled={!inventoryId}>
          Створити
        </Button>
      </div>
      <CatalogItemLink codes={[archiveCode, fondPicker.selected?.code, selectedInventory?.code]} />

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
            type: "numericColumn",
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valueGetter: (p: any) => (p.data?.online_copies ?? []).length,
          },
          {
            headerName: "",
            flex: 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cellRenderer: (row: any) => (
              <EditCell
                hasPending={row.data.has_pending_action}
                onEdit={() => {
                  setSelected(row.data);
                  syncEditorUrl({ edit: row.data.id });
                }}
              />
            ),
          },
        ]}
      />

      <FileEditModal
        file={selected}
        isOpen={Boolean(selected)}
        onClose={() => {
          setSelected(null);
          syncEditorUrl({ edit: null });
        }}
        onSubmitted={mutate}
      />
      <FileAddModal
        inventory={selectedInventory ?? null}
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSubmitted={mutate}
      />
    </section>
  );
}
