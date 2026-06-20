"use client";

import ActionsTable from "@/components/editor/actions-table";

export default function EditorDashboardPage() {
  return (
    <section className="flex flex-col gap-6">
      <ActionsTable entity="file" title="Справи" />
      <ActionsTable entity="inventory" title="Описи" />
      <ActionsTable entity="fond" title="Фонди" />
    </section>
  );
}
