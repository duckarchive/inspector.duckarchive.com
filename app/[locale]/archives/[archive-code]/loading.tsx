"use client";

import { DuckTableSkeleton, PagePanelSkeleton } from "@duckarchive/framework";

export default function LoadingArchivesPage() {
  return (
    <>
      <PagePanelSkeleton />
      <DuckTableSkeleton withFilters />
    </>
  );
}
