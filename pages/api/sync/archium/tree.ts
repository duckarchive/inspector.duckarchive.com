import { NextApiRequest, NextApiResponse } from "next";
import { PrismaClient, ResourceType } from "@prisma/client";
import { chunk } from "lodash";

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const success = await recalculateTree();

    res.status(200).json({ success });
  } else {
    res.status(405);
  }
}

export const recalculateDescriptionChildrenCount = async () => {
  console.log(`ARCHIUM: recalculateDescriptionChildrenCount`);
  const resource = await prisma.resource.findFirst({
    where: {
      type: ResourceType.ARCHIUM,
    },
  });

  const descriptionsToUpdate: { description_id: string; count: number }[] = await prisma.$queryRaw`
    select description_id, count(*)::integer
    from matches
    where case_id is not null
    and children_count > 0
    and resource_id = ${resource?.id}::uuid
    group by description_id;
  `;

  const descriptionsToUpdateChunks = chunk(descriptionsToUpdate, 20);

  for (const descriptionsToUpdateChunk of descriptionsToUpdateChunks) {
    await Promise.all(
      descriptionsToUpdateChunk.map(async ({ description_id, count }) => {
        const match = await prisma.match.findFirst({
          where: {
            resource_id: resource?.id,
            description_id,
            case_id: null,
          },
        });
        if (match && count !== match.children_count) {
          await prisma.match.update({
            where: {
              id: match.id,
              resource_id: resource?.id,
            },
            data: {
              children_count: count,
            },
          });
        }
      })
    );
  }
};

export const recalculateFundChildrenCount = async () => {
  console.log(`ARCHIUM: recalculateFundChildrenCount`);
  const resource = await prisma.resource.findFirst({
    where: {
      type: ResourceType.ARCHIUM,
    },
  });

  const fundsToUpdate: { fund_id: string; count: number }[] = await prisma.$queryRaw`
    select fund_id, count(*)::integer
    from matches
    where description_id is not null
    and case_id is null
    and children_count > 0
    and resource_id = ${resource?.id}::uuid
    group by fund_id;
  `;

  const fundsToUpdateChunks = chunk(fundsToUpdate, 20);

  for (const fundsToUpdateChunk of fundsToUpdateChunks) {
    await Promise.all(
      fundsToUpdateChunk.map(async ({ fund_id, count }) => {
        const match = await prisma.match.findFirst({
          where: {
            resource_id: resource?.id,
            fund_id,
            description_id: null,
            case_id: null,
          },
        });
        if (match && count !== match.children_count) {
          await prisma.match.update({
            where: {
              id: match.id,
              resource_id: resource?.id,
            },
            data: {
              children_count: count,
            },
          });
        }
      })
    );
  }
};

export const recalculateArchiveChildrenCount = async () => {
  console.log(`ARCHIUM: recalculateArchiveChildrenCount`);
  const resource = await prisma.resource.findFirst({
    where: {
      type: ResourceType.ARCHIUM,
    },
  });

  const archivesToUpdate: { archive_id: string; count: number }[] = await prisma.$queryRaw`
    select archive_id, count(*)::integer
    from matches
    where fund_id is not null
    and description_id is null
    and case_id is null
    and children_count > 0
    and resource_id = ${resource?.id}::uuid
    group by archive_id;
  `;

  const archivesToUpdateChunks = chunk(archivesToUpdate, 20);

  for (const archivesToUpdateChunk of archivesToUpdateChunks) {
    await Promise.all(
      archivesToUpdateChunk.map(async ({ archive_id, count }) => {
        const match = await prisma.match.findFirst({
          where: {
            resource_id: resource?.id,
            archive_id,
            fund_id: null,
            description_id: null,
            case_id: null,
          },
        });
        if (match && count !== match.children_count) {
          await prisma.match.update({
            where: {
              id: match.id,
              resource_id: resource?.id,
            },
            data: {
              children_count: count,
            },
          });
        }
      })
    );
  }
};

export const recalculateTree = async () => {
  try {
    await recalculateDescriptionChildrenCount();
    await recalculateFundChildrenCount();
    await recalculateArchiveChildrenCount();
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};
