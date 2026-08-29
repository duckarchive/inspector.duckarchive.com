import { unstable_cache } from "next/cache";
import prisma from "@/lib/db";
import { Availability, Resource } from "@generated/prisma/client/client";

export interface OnlineCopyCounts {
  public: number;
  restricted: number;
  paywall: number;
  /** availability is nullable — legacy rows never classified by the sync job. */
  unknown: number;
}

export type Resources = Record<Resource["id"], Resource>;
export type ResourcesWithCounts = Record<Resource["id"], Resource & { _count: OnlineCopyCounts }>;

const COUNTS_REVALIDATE_SECONDS = 60 * 60;
const EMPTY_COUNTS: OnlineCopyCounts = { public: 0, restricted: 0, paywall: 0, unknown: 0 };

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
 * Online-copy count per resource, broken down by availability — a resource like
 * LIBRARIA, whose links are all PAYWALL, would otherwise show up as 0 despite
 * having cases linked if only PUBLIC were counted. Parallel seq scan over ~2.9M
 * rows (~1s), so it is cached for an hour instead of running per request; only
 * /resources shows it.
 */
const getOnlineCopyCounts = unstable_cache(
  async (): Promise<Record<Resource["id"], OnlineCopyCounts>> => {
    const groups = await prisma.onlineCopy.groupBy({
      by: ["resource_id", "availability"],
      _count: { _all: true },
    });

    const counts: Record<Resource["id"], OnlineCopyCounts> = {};
    for (const group of groups) {
      const resourceCounts = (counts[group.resource_id] ??= { ...EMPTY_COUNTS });
      if (group.availability === Availability.PUBLIC) resourceCounts.public += group._count._all;
      else if (group.availability === Availability.RESTRICTED) resourceCounts.restricted += group._count._all;
      else if (group.availability === Availability.PAYWALL) resourceCounts.paywall += group._count._all;
      else resourceCounts.unknown += group._count._all;
    }

    return counts;
  },
  ["online-copies-counts-by-availability"],
  { revalidate: COUNTS_REVALIDATE_SECONDS },
);

export const getResourcesWithCounts = async (): Promise<ResourcesWithCounts> => {
  const [resources, counts] = await Promise.all([getResources(), getOnlineCopyCounts()]);

  const withCounts: ResourcesWithCounts = {};
  for (const resource of Object.values(resources)) {
    withCounts[resource.id] = { ...resource, _count: counts[resource.id] ?? { ...EMPTY_COUNTS } };
  }

  return withCounts;
};
