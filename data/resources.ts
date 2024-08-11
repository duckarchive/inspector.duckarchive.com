import prisma from "../lib/db";
import { Resource } from "@prisma/client";

export type Resources = Record<Resource["id"], Resource & { _count: { matches: number } }>;

export const getResources = async () => {
  const resourcesDb = await prisma.resource.findMany({
    include: {
      _count: {
        select: {
          matches: {
            where: {
              case_id: {
                not: null,
              },
              children_count: {
                gt: 0,
              },
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