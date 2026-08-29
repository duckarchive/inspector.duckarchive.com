import { getResourcesWithCounts } from "@/data/resources";
import PagePanel from "@/components/page-panel";
import ResourcesTable from "@/components/resources-table";
import { NextPage } from "next";

const ResourcesPage: NextPage = async () => {
  const resources = await getResourcesWithCounts();

  return (
    <>
      <PagePanel
        title="Джерела"
        description="Список вебсайтів та сервісів, на яких розміщені онлайн копії"
      />
      <ResourcesTable resources={resources} />
    </>
  );
};

export default ResourcesPage;
