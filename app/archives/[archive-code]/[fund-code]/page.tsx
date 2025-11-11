import FundTable from "@/components/fund-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { getFundByCode } from "@/app/api/archives/[archive-code]/[fund-code]/data";
import { getTranslations } from "next-intl/server";

export interface FundPageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
  }>;
}

export async function generateMetadata(pageProps: FundPageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const fallback = {
    code: "-",
    title: "Фонд",
    description: "Деталі фонду",
  };
  try {
    const t = await getTranslations("metadata");
    const params = await pageProps.params;
    const { openGraph } = await parent;
    const archiveCode = decodeURIComponent(params["archive-code"]);
    const code = decodeURIComponent(params["fund-code"]);
    const fund = (await getFundByCode(archiveCode, code)) || fallback;

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
  } catch (error) {
    console.log("failed to generate metadata for fund page", error);
    return fallback;
  }
}

const FundPage: NextPage = async () => {
  const resources = await getResources();

  return <FundTable resources={resources} />;
};

export default FundPage;
