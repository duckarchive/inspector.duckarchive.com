"use client";

import PagePanelSkeleton from "@/components/page-panel-skeleton";
import DuckTableSkeleton from "@/components/duck-table-skeleton";

export default function LoadingArchivesPage() {
  return (
    <>
      <PagePanelSkeleton />
      <DuckTableSkeleton />
    </>
  );
}
