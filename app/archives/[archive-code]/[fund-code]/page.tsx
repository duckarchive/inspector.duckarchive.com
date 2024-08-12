import FundTable from "@/components/fund-table";
import { NextPage } from "next";
import { getResources } from "@/data/resources";

const FundPage: NextPage = async () => {
  const resources = await getResources();

  return <FundTable resources={resources} />;
};

export default FundPage;
