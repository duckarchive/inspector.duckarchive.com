"use client";

import { Key, useState } from "react";
import InspectorDuckTable from "@/components/table";
import Select from "@/components/select";
import EditCell from "@/components/editor/edit-cell";
import InventoryEditModal from "@/components/editor/inventory-edit-modal";
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
        <Select
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
          }}
          className="max-w-xs"
        />
        <Select
          items={fonds ?? []}
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
          onChange={(key: Key | null) => setFondId(String(key ?? ""))}
          className="max-w-xs"
        />
      </div>

      {fondId && (
        <InspectorDuckTable<EditorInventory>
          id="editor-inventories-table"
          isLoading={isLoading}
          rows={inventories ?? []}
          columns={[
            { field: "code", headerName: "Код" },
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
