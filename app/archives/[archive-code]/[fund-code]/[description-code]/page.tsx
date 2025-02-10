import DescriptionTable from "@/components/description-table";
import { Metadata, NextPage } from "next";
import { getResources } from "@/data/resources";
import { GetDescriptionResponse } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/route";
import { siteConfig } from "@/config/site";

export interface DescriptionPageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
  }>;
}

export async function generateMetadata(pageProps: DescriptionPageProps): Promise<Metadata> {
  const params = await pageProps.params;
  const archiveCode = decodeURIComponent(params["archive-code"]);
  const fundCode = decodeURIComponent(params["fund-code"]);
  const code = decodeURIComponent(params["description-code"]);
  const description: GetDescriptionResponse = await fetch(
    `${siteConfig.url}/api/archives/${archiveCode}/${fundCode}/${code}`,
  ).then((res) => res.json());

  const name = description.title ? ` (${description.title})` : "";

  return {
    title: `${archiveCode}-${fundCode}-${description.code}`,
    description: `Пошук справ онлайн в описі ${archiveCode}-${fundCode}-${description.code}${name} / архів ${archiveCode} фонд ${fundCode} опис ${description.code} / ${archiveCode} ф.${fundCode}, о.${description.code} / ${archiveCode} ф.${fundCode}, оп.${description.code}`,
  };
}

const DescriptionPage: NextPage = async () => {
  const resources = await getResources();

  return <DescriptionTable resources={resources} />;
};

export default DescriptionPage;
