import { getResourcesWithCounts } from "@/data/resources";
import PagePanel from "@/components/page-panel";
import ResourcesTable from "@/components/resources-table";
import { NextPage } from "next";
import { getTranslations } from "next-intl/server";

const ResourcesPage: NextPage = async () => {
  const t = await getTranslations("resources-page");
  const resources = await getResourcesWithCounts();

  return (
    <>
      <PagePanel
        title={t("title")}
        description={t("description")}
      />
      <ResourcesTable resources={resources} />
    </>
  );
};

export default ResourcesPage;
