"use client";

import { Key, useState } from "react";
import InspectorDuckTable from "@/components/table";
import SelectArchive from "@/components/select-archive";
import EditCell from "@/components/editor/edit-cell";
import FondEditModal from "@/components/editor/fond-edit-modal";
import { useGet } from "@/hooks/useApi";
import { useEditorFonds } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";

export default function EditorFondsPage() {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState<string>("");
  const { data: fonds, isLoading, mutate } = useEditorFonds(archiveCode || undefined);
  const [selected, setSelected] = useState<EditorFond | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Фонди</h1>
      <SelectArchive
        archives={archives ?? []}
        value={archiveCode}
        onChange={(key: Key | null) => setArchiveCode(String(key ?? ""))}
        className="max-w-xs"
      />

      {archiveCode && (
        <InspectorDuckTable<EditorFond>
          id="editor-fonds-table"
          isLoading={isLoading}
          rows={fonds ?? []}
          columns={[
            { field: "code", headerName: "Код" },
            { field: "title", headerName: "Назва", flex: 5 },
            { field: "info", headerName: "Опис", flex: 5 },
            {
              headerName: "Роки",
              flex: 2,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              valueGetter: (p: any) =>
                (p.data?.years ?? []).map((y: { start_year: number; end_year: number }) => `${y.start_year}–${y.end_year}`).join(", "),
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

      <FondEditModal
        fond={selected}
        archives={archives ?? []}
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onSubmitted={mutate}
      />
    </section>
  );
}
