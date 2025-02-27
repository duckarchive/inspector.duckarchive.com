"use client";

import { Skeleton } from "@heroui/react";
import DuckTableSkeleton from "@/components/duck-table-skeleton";

export default function Loading() {
  return (
    <div className="flex-col flex justify-between gap-2">
      <Skeleton className="rounded-lg h-5 w-1/3" />
      <Skeleton className="rounded-lg h-14 w-full" />
      <div className="flex flex-wrap gap-2">
        <Skeleton className="rounded-lg h-14 grow" />
        <Skeleton className="rounded-lg h-14 grow" />
        <Skeleton className="rounded-lg h-14 grow" />
      </div>
      <Skeleton className="rounded-lg h-14 w-full" />
      <div className="flex flex-wrap justify-between w-full">
        <Skeleton className="rounded-lg h-4 w-1/3" />
        <Skeleton className="rounded-lg h-4 w-1/5" />
      </div>
      <DuckTableSkeleton />
    </div>
  );
}
