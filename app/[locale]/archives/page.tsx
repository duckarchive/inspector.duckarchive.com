import PagePanel from "@/components/page-panel";
import ArchivesTable from "@/components/archives-table";
import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import { getTranslations } from "next-intl/server";

const ArchivesPage: NextPage = async () => {
  const t = await getTranslations("archives-page");
  const archives = await getArchives();

  return (
    <>
      <PagePanel
        title={t("title")}
        description={t("description")}
      />
      <ArchivesTable archives={archives} />
    </>
  );
};

export default ArchivesPage;
