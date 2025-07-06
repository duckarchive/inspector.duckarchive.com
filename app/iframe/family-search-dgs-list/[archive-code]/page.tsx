import DGSArchiveTable from "@/components/dgs-archive-table";
import { NextPage } from "next";
import prisma from "@/lib/db";
import { getDGSListByArchive } from "@/data/dgs-archive-list";

export const dynamic  = "force-static";
export const revalidate = false;
export const dynamicParams = false;

export interface DGSArchivePageProps {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function generateStaticParams() {
  const archives = await prisma.archive.findMany({
    select: { code: true },
  });

  return archives.map(({ code }) => ({ "archive-code": code }));
}

const DGSArchivePage: NextPage<DGSArchivePageProps> = async ({ params }) => {
  const p = await params;
  const archiveCode = decodeURIComponent(p["archive-code"]);
  const dgsList = await getDGSListByArchive(archiveCode);
  const updatedAt = new Date().toISOString().split("T")[0];

  return (
    <DGSArchiveTable
      updatedAt={updatedAt}
      items={dgsList}
    />
  );
};

export default DGSArchivePage;
