import { getResources } from "@/data/resources";
import PagePanel from "@/components/page-panel";
import ResourcesTable from "@/components/resources-table";

const ResourcesPage = async () => {
  const resources = await getResources();

  return (
    <>
      <PagePanel
        title="Джерела"
        description="Список вебсайтів та інших сервісів, де можна знайти справи онлайн"
      />
      <ResourcesTable resources={resources} />
    </>
  );
};

export default ResourcesPage;
