import CaseTable from "@/components/case-table";
import { Metadata, NextPage } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "@/config/site";
import { GetCaseResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/route";

export interface CasePageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
    "case-code": string;
  }>;
}

export async function generateMetadata(
  pageProps: CasePageProps
): Promise<Metadata> {
  const params  = await pageProps.params;
  const archiveCode = decodeURIComponent(params["archive-code"]);
  const fundCode = decodeURIComponent(params["fund-code"]);
  const descriptionCode = decodeURIComponent(params["description-code"]);
  const code = decodeURIComponent(params["case-code"]);
  const caseItem: GetCaseResponse = await fetch(`${siteConfig.url}/api/archives/${archiveCode}/${fundCode}/${descriptionCode}/${code}`).then((res) => res.json())
  
  const name = caseItem.title ? ` (${caseItem.title})`: "";

  return {
    title: `${archiveCode}-${fundCode}-${descriptionCode}-${code}`,
    description: `Справа онлайн ${archiveCode}-${fundCode}-${descriptionCode}-${code}${name} / архів ${archiveCode} фонд ${fundCode} опис ${descriptionCode} справа ${code} / ${archiveCode} ф.${fundCode}, о.${descriptionCode}, с.${code} / ${archiveCode} ф.${fundCode}, оп.${descriptionCode}, спр.${code}`,
  }
}

const CasePage: NextPage = async () => {
  const resources = await getResources();

  return <CaseTable resources={resources} />;
};

export default CasePage;
