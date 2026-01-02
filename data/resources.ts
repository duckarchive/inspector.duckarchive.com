import prisma from "@/lib/db";
import { Resource } from "@/generated/prisma/client";

export type Resources = Record<Resource["id"], Resource & { _count: { online_copies: number } }>;

export const getResources = async () => {
  const resourcesDb = await prisma.resource.findMany({
    include: {
      _count: {
        select: {
          case_online_copies: {
            where: {
              url: {
                not: null,
              },
            },
          },
          description_online_copies: {
            where: {
              url: {
                not: null,
              },
            },
          },
        },
      },
    },
  });

  const resources: Resources = {};
  for (const resource of resourcesDb) {
    resources[resource.id] = {
      ...resource,
      _count: {
        online_copies: (resource._count.case_online_copies || 0) + (resource._count.description_online_copies || 0),
      },
    };
  }

  return resources;
};
