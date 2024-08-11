import PagePanel from "@/components/page-panel";
import ArchivesTable from "@/components/archives-table";
import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import { getResources } from "../../data/resources";

const ArchivesPage: NextPage = async () => {
  const resources = await getResources();
  const archives = await getArchives();

  return (
    <>
      <PagePanel
        title="Архіви"
        description="Список архівів в базі Інспектора"
      />
      <ArchivesTable resources={resources} archives={archives} />
    </>
  );
};

export default ArchivesPage;
