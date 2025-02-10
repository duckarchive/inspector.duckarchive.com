"use client";
import { Skeleton } from "@heroui/react";

interface DuckTableSkeletonProps {
  withFilters?: boolean;
}

const DuckTableSkeleton: React.FC<DuckTableSkeletonProps> = ({ withFilters }) => (
  <div className="flex flex-col grow items-start gap-2">
    <div className="h-10 w-full flex items-center gap-2">
      {withFilters && (
        <>
          <Skeleton className="rounded-xl h-8 w-32" />
          <Skeleton className="rounded-xl h-8 w-32" />
          <Skeleton className="rounded-xl h-8 w-32" />
        </>
      )}
    </div>
    <Skeleton className="rounded-lg h-96 flex-grow w-full" />
  </div>
);

export default DuckTableSkeleton;
