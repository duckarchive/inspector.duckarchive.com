import ArchiveTable from "@/components/archive-table";
import { NextPage } from "next";
import { getResources } from "@/data/resources";

const ArchivePage: NextPage = async () => {
  const resources = await getResources();

  return <ArchiveTable resources={resources} />;
};

export default ArchivePage;
