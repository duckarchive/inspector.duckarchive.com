"use client";
import { Skeleton } from "@heroui/skeleton";

const PagePanelSkeleton: React.FC = () => (
  <div className="flex-col md:flex-row flex justify-between gap-4">
    <div className="flex flex-col grow items-start gap-2 py-1">
      <Skeleton className="rounded-lg h-5 w-1/4" />
      <Skeleton className="rounded-lg h-4 w-1/3" />
    </div>
  </div>
);

export default PagePanelSkeleton;
