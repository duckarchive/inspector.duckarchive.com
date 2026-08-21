import prisma from "@/lib/db";
import { Availability, Resource } from "@generated/prisma/client/client";

export type Resources = Record<Resource["id"], Resource & { _count: { online_copies: number } }>;

export const getResources = async () => {
  // per-resource public counter; served by the partial index
  // online_copies_public_by_resource_idx (resource_id WHERE availability = 'PUBLIC')
  const resourcesDb = await prisma.resource.findMany({
    include: {
      _count: {
        select: {
          online_copies: {
            where: {
              availability: Availability.PUBLIC,
            },
          },
        },
      },
    },
  });

  const resources: Resources = {};
  for (const resource of resourcesDb) {
    resources[resource.id] = resource;
  }

  return resources;
};
