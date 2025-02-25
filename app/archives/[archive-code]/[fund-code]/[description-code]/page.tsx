import DescriptionTable from "@/components/description-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { GetDescriptionResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/route";
import { siteConfig } from "@/config/site";
import { getTranslations } from "next-intl/server";

export interface DescriptionPageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
  }>;
}

export async function generateMetadata(pageProps: DescriptionPageProps,
  parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const params = await pageProps.params;
  const { openGraph } = await parent;
  const archiveCode = decodeURIComponent(params["archive-code"]);
  const fundCode = decodeURIComponent(params["fund-code"]);
  const code = decodeURIComponent(params["description-code"]);
  const description: GetDescriptionResponse = await fetch(
    `${siteConfig.url}/api/archives/${archiveCode}/${fundCode}/${code}`,
  ).then((res) => res.json());

  const name = description.title ? ` (${description.title})` : "";

  return {
    title: `${archiveCode}-${fundCode}-${description.code}`,
    description:  t("description-description", { archiveCode, fundCode: code, descriptionCode: description.code, descriptionTitle: name }),
    openGraph: {
      ...openGraph,
      type: "website",
      url: `/archives/${archiveCode}/${fundCode}/${code}`,
    },
  };
}

const DescriptionPage: NextPage = async () => {
  const resources = await getResources();

  return <DescriptionTable resources={resources} />;
};

export default DescriptionPage;
