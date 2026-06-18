"use client";

import { Key, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import InspectorDuckTable from "@/components/table";
import SelectArchive from "@/components/select-archive";
import EditCell from "@/components/editor/edit-cell";
import FileEditModal from "@/components/editor/file-edit-modal";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";
import { useGet } from "@/hooks/useApi";
import { useEditorFiles, useEditorFonds, useEditorInventories } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { EditorFile } from "@/app/api/editor/catalog/files/data";

export default function EditorFilesPage() {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState("");
  const [fondId, setFondId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const { data: fonds } = useEditorFonds(archiveCode || undefined);
  const { data: inventories } = useEditorInventories(fondId || undefined);
  const { data: files, isLoading, mutate } = useEditorFiles(inventoryId || undefined);
  const [selected, setSelected] = useState<EditorFile | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Справи</h1>
      <div className="flex flex-wrap gap-3">
        <SelectArchive
          archives={archives ?? []}
          value={archiveCode}
          onChange={(key: Key | null) => {
            setArchiveCode(String(key ?? ""));
            setFondId("");
            setInventoryId("");
          }}
          className="max-w-xs"
        />
        <Autocomplete
          size="sm"
          label="Фонд"
          className="max-w-xs"
          isDisabled={!archiveCode}
          {...editorAutocompleteVirtualization}
          selectedKey={fondId || null}
          onSelectionChange={(key: Key | null) => {
            setFondId(String(key ?? ""));
            setInventoryId("");
          }}
          defaultItems={fonds ?? []}
        >
          {(f) => (
            <AutocompleteItem key={f.id} textValue={`${f.code} ${f.title ?? ""}`} classNames={wrapItemClassNames}>
              {f.code} {f.title ? `— ${f.title}` : ""}
            </AutocompleteItem>
          )}
        </Autocomplete>
        <Autocomplete
          size="sm"
          label="Опис"
          className="max-w-xs"
          isDisabled={!fondId}
          {...editorAutocompleteVirtualization}
          selectedKey={inventoryId || null}
          onSelectionChange={(key: Key | null) => setInventoryId(String(key ?? ""))}
          defaultItems={inventories ?? []}
        >
          {(inv) => (
            <AutocompleteItem key={inv.id} textValue={`${inv.code} ${inv.title ?? ""}`} classNames={wrapItemClassNames}>
              {inv.code} {inv.title ? `— ${inv.title}` : ""}
            </AutocompleteItem>
          )}
        </Autocomplete>
      </div>

      {inventoryId && (
        <InspectorDuckTable<EditorFile>
          id="editor-files-table"
          isLoading={isLoading}
          rows={files ?? []}
          columns={[
            { field: "code", headerName: "Індекс" },
            { field: "title", headerName: "Назва", flex: 5 },
            {
              headerName: "Автори",
              flex: 3,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              valueGetter: (p: any) => (p.data?.authors ?? []).map((a: { author: { title: string } }) => a.author.title).join(", "),
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
      )}

      <FileEditModal file={selected} isOpen={Boolean(selected)} onClose={() => setSelected(null)} onSubmitted={mutate} />
    </section>
  );
}
