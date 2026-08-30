import PagePanel from "@/components/page-panel";
import ArchivesTable from "@/components/archives-table";
import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import { getTranslations } from "next-intl/server";
import TranslateToggle from "@/components/translate-toggle";

const ArchivesPage: NextPage = async () => {
  const t = await getTranslations("archives-page");
  const archives = await getArchives();

  return (
    <>
      <PagePanel
        breadcrumbs={[]}
        title={t("title")}
        description={t("description")}
      >
        <TranslateToggle />
      </PagePanel>
      <ArchivesTable archives={archives} />
    </>
  );
};

export default ArchivesPage;
