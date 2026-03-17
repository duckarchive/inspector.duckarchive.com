import { Archive } from "@/generated/prisma/client/client";
import prisma from "@/lib/db";

export const getArchives = async (): Promise<Archive[] | null> => {
  const archives = await prisma.archive.findMany();
  return archives;
};
