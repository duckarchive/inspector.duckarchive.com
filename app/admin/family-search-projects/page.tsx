import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import { getFSProjects } from "@/data/family-search";
import FSProjectTable from "@/components/family-search-project-table";

const FSProjectsPage: NextPage = async () => {
  const projects = await getFSProjects();

  return (
    <>
      <PagePanel title="Проєкти Family Search" description="Список проєктів з інформацією про кількість справ." />
      <FSProjectTable projects={projects} />
    </>
  );
};

export default FSProjectsPage;
