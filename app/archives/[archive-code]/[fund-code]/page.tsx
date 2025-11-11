import FundTable from "@/components/fund-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "@/config/site";
import { GetFundResponse } from "@/app/api/archives/[archive-code]/[fund-code]/route";
import { getTranslations } from "next-intl/server";

export interface FundPageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
  }>;
}

export async function generateMetadata(pageProps: FundPageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const params = await pageProps.params;
  const { openGraph } = await parent;
  const archiveCode = decodeURIComponent(params["archive-code"]);
  const code = decodeURIComponent(params["fund-code"]);
  const fund: GetFundResponse = await fetch(`${siteConfig.url}/api/archives/${archiveCode}/${code}`).then((res) =>
    res.json()
  );
  console.log("fund", fund);

  const name = fund.title ? ` (${fund.title})` : "";

  return {
    title: `${archiveCode}-${code}`,
    description: t("fund-description", { archiveCode, fundCode: code, fundTitle: name }),
    openGraph: {
      ...openGraph,
      type: "website",
      url: `/archives/${archiveCode}/${code}`,
    },
  };
}

const FundPage: NextPage = async () => {
  const resources = await getResources();

  return <FundTable resources={resources} />;
};

export default FundPage;
