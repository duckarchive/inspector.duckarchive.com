"use client";

import { Skeleton } from "@heroui/react";

export default function Loading() {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4">
      <div className="flex flex-col grow items-start gap-2 p-2">
        <Skeleton className="rounded-lg h-5 w-1/3" />
        <Skeleton className="rounded-lg h-4 w-full" />
        <Skeleton className="rounded-lg h-4 w-full" />
        <Skeleton className="rounded-lg h-4 w-2/3" />
      </div>
      <Skeleton className="rounded-lg w-full md:w-1/2 h-[200px]" />
    </div>
  );
}
