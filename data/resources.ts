import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { Availability, Resource } from "@generated/prisma/client/client";

export type Resources = Record<Resource["id"], Resource>;
export type ResourcesWithCounts = Record<Resource["id"], Resource & { _count: { online_copies: number } }>;

const COUNTS_REVALIDATE_SECONDS = 60 * 60;

/** Resource metadata only (28 rows) — what catalog pages need for badges. */
export const getResources = async (): Promise<Resources> => {
  const resourcesDb = await prisma.resource.findMany();

  const resources: Resources = {};
  for (const resource of resourcesDb) {
    resources[resource.id] = resource;
  }

  return resources;
};

/**
 * Public online-copy count per resource. One index-only GroupAggregate over
 * online_copies_public_by_resource_idx (~2.4M entries, ~0.3s), so it is cached
 * for an hour instead of running per request; only /resources shows it.
 */
const getPublicOnlineCopyCounts = unstable_cache(
  async (): Promise<Record<Resource["id"], number>> => {
    const groups = await prisma.onlineCopy.groupBy({
      by: ["resource_id"],
      where: { availability: Availability.PUBLIC },
      _count: { _all: true },
    });

    return Object.fromEntries(groups.map((group) => [group.resource_id, group._count._all]));
  },
  ["online-copies-public-counts"],
  { revalidate: COUNTS_REVALIDATE_SECONDS },
);

export const getResourcesWithCounts = async (): Promise<ResourcesWithCounts> => {
  const [resources, counts] = await Promise.all([getResources(), getPublicOnlineCopyCounts()]);

  const withCounts: ResourcesWithCounts = {};
  for (const resource of Object.values(resources)) {
    withCounts[resource.id] = { ...resource, _count: { online_copies: counts[resource.id] ?? 0 } };
  }

  return withCounts;
};
