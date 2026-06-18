"use client";

import { useState } from "react";
import { Input } from "@heroui/input";
import InspectorDuckTable from "@/components/table";
import EditCell from "@/components/editor/edit-cell";
import AuthorEditModal from "@/components/editor/author-edit-modal";
import { useEditorAuthors } from "@/hooks/useEditor";
import { EditorAuthor } from "@/app/api/editor/authors/data";

export default function EditorAuthorsPage() {
  const [query, setQuery] = useState("");
  const { data: authors, isLoading, mutate } = useEditorAuthors(query || undefined);
  const [selected, setSelected] = useState<EditorAuthor | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Автори</h1>
      <Input
        isClearable
        className="max-w-sm"
        label="Пошук автора"
        value={query}
        onValueChange={setQuery}
        onClear={() => setQuery("")}
      />

      <InspectorDuckTable<EditorAuthor>
        id="editor-authors-table"
        isLoading={isLoading}
        rows={authors ?? []}
        columns={[
          { field: "title", headerName: "Назва", flex: 5 },
          { field: "info", headerName: "Опис", flex: 5 },
          {
            headerName: "Теги",
            flex: 3,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valueGetter: (p: any) => (p.data?.tags ?? []).join(", "),
          },
          {
            headerName: "Справ",
            flex: 1,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            valueGetter: (p: any) => p.data?._count?.file_authors ?? 0,
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

      <AuthorEditModal author={selected} isOpen={Boolean(selected)} onClose={() => setSelected(null)} onSubmitted={mutate} />
    </section>
  );
}
