import PagePanel from "@/components/page-panel";
import ArchivesTable from "@/components/archives-table";
import { NextPage } from "next";
import { getArchives } from "@/data/archives";

const ArchivesPage: NextPage = async () => {
  const archives = await getArchives();

  return (
    <>
      <PagePanel
        title="Архіви"
        description="Список архівів в базі Інспектора"
      />
      <ArchivesTable archives={archives} />
    </>
  );
};

export default ArchivesPage;
