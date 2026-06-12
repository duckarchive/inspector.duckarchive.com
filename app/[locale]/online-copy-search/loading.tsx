"use client";

import { DuckTableSkeleton } from "@duckarchive/framework";
import { Skeleton } from "@heroui/skeleton";

export default function Loading() {
  return (
    <div className="flex-col flex justify-between gap-2">
      <Skeleton className="rounded-lg h-14 w-full" />
      <Skeleton className="rounded-lg h-4 w-1/3" />
      <DuckTableSkeleton />
    </div>
  );
}
