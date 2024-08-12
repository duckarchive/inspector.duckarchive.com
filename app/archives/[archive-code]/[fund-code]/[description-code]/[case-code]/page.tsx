import CaseTable from "@/components/case-table";
import { NextPage } from "next";
import { getResources } from "@/data/resources";

const CasePage: NextPage = async () => {
  const resources = await getResources();

  return <CaseTable resources={resources} />;
};

export default CasePage;
