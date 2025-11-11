import CaseTable from "@/components/case-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "@/config/site";
import { GetCaseResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]/route";
import { getTranslations } from "next-intl/server";

export interface CasePageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
    "case-code": string;
  }>;
}

export async function generateMetadata(pageProps: CasePageProps, parent: ResolvingMetadata): Promise<Metadata> {
  try {
    const t = await getTranslations("metadata");
    const params = await pageProps.params;
    const { openGraph } = await parent;
    const archiveCode = decodeURIComponent(params["archive-code"]);
    const fundCode = decodeURIComponent(params["fund-code"]);
    const descriptionCode = decodeURIComponent(params["description-code"]);
    const code = decodeURIComponent(params["case-code"]);
    const caseItem: GetCaseResponse = await fetch(
      `${siteConfig.url}/api/archives/${archiveCode}/${fundCode}/${descriptionCode}/${code}`
    ).then((res) => res.json());
    console.log("caseItem", caseItem);

    const name = caseItem.title ? ` (${caseItem.title})` : "";

    return {
      title: `${archiveCode}-${fundCode}-${descriptionCode}-${code}`,
      description: t("case-description", { archiveCode, fundCode, descriptionCode, caseCode: code, caseTitle: name }),
      openGraph: {
        ...openGraph,
        type: "website",
        url: `/archives/${archiveCode}/${fundCode}/${descriptionCode}/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for case page", error);
    return {
      title: "Справа",
      description: "Деталі справи",
    };
  }
}

const CasePage: NextPage = async () => {
  const resources = await getResources();

  return <CaseTable resources={resources} />;
};

export default CasePage;
