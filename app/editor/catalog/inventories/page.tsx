"use client";

import { Key, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import InspectorDuckTable from "@/components/table";
import SelectArchive from "@/components/select-archive";
import EditCell from "@/components/editor/edit-cell";
import InventoryEditModal from "@/components/editor/inventory-edit-modal";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";
import { useGet } from "@/hooks/useApi";
import { useEditorFonds, useEditorInventories } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";

export default function EditorInventoriesPage() {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState("");
  const [fondId, setFondId] = useState("");
  const { data: fonds } = useEditorFonds(archiveCode || undefined);
  const { data: inventories, isLoading, mutate } = useEditorInventories(fondId || undefined);
  const [selected, setSelected] = useState<EditorInventory | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Описи</h1>
      <div className="flex flex-wrap gap-3">
        <SelectArchive
          archives={archives ?? []}
          value={archiveCode}
          onChange={(key: Key | null) => {
            setArchiveCode(String(key ?? ""));
            setFondId("");
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
          onSelectionChange={(key: Key | null) => setFondId(String(key ?? ""))}
          defaultItems={fonds ?? []}
        >
          {(f) => (
            <AutocompleteItem key={f.id} textValue={`${f.code} ${f.title ?? ""}`} classNames={wrapItemClassNames}>
              {f.code} {f.title ? `— ${f.title}` : ""}
            </AutocompleteItem>
          )}
        </Autocomplete>
      </div>

      {fondId && (
        <InspectorDuckTable<EditorInventory>
          id="editor-inventories-table"
          isLoading={isLoading}
          rows={inventories ?? []}
          columns={[
            { field: "code", headerName: "Індекс" },
            { field: "title", headerName: "Назва", flex: 5 },
            { field: "info", headerName: "Опис", flex: 5 },
            {
              headerName: "Онлайн-копії",
              flex: 2,
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

      <InventoryEditModal
        inventory={selected}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onSubmitted={mutate}
      />
    </section>
  );
}
