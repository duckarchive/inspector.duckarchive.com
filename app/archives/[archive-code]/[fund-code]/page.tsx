import FundTable from "@/components/fund-table";
import { Metadata, NextPage } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "@/config/site";
import { GetFundResponse } from "@/app/api/archives/[archive-code]/[fund-code]/route";

export interface FundPageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
  }>;
}

export async function generateMetadata(
  pageProps: FundPageProps
): Promise<Metadata> {
  const params  = await pageProps.params;
  const archiveCode = decodeURIComponent(params["archive-code"]);
  const code = decodeURIComponent(params["fund-code"]);
  const fund: GetFundResponse = await fetch(`${siteConfig.url}/api/archives/${archiveCode}/${code}`).then((res) => res.json())
  
  const name = fund.title ? ` (${fund.title})`: "";

  return {
    title: `${archiveCode}-${code}`,
    description: `Пошук справ онлайн в фонді ${archiveCode}-${code}${name} / архів ${archiveCode} фонд ${code} / ${archiveCode} ф.${code}`,
    openGraph: {
      type: "website",
      url: `/archives/${archiveCode}/${code}`,
    },
  }
}

const FundPage: NextPage = async () => {
  const resources = await getResources();

  return <FundTable resources={resources} />;
};

export default FundPage;
