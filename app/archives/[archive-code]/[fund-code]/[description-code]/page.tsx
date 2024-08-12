import DescriptionTable from "@/components/description-table";
import { NextPage } from "next";
import { getResources } from "@/data/resources";

const DescriptionPage: NextPage = async () => {
  const resources = await getResources();

  return <DescriptionTable resources={resources} />;
};

export default DescriptionPage;
