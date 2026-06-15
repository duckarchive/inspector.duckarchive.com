import PagePanel from "@/components/page-panel";
import ArchivesTable from "@/components/archives-table";
import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import { getResources } from "@/data/resources";

const CatalogPage: NextPage = async () => {
  const resources = await getResources();
  const archives = await getArchives();

  return (
    <>
      <PagePanel
        title="Каталог"
        description="Список архівів в базі Інспектора"
      />
      <ArchivesTable resources={resources} archives={archives} basePath="catalog/" />
    </>
  );
};

export default CatalogPage;
