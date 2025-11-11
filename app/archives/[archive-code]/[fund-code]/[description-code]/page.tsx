import DescriptionTable from "@/components/description-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { getDescriptionByCode } from "@/app/api/archives/[archive-code]/[fund-code]/[description-code]/data";
import { getTranslations } from "next-intl/server";

export interface DescriptionPageProps {
  params: Promise<{
    "archive-code": string;
    "fund-code": string;
    "description-code": string;
  }>;
}

export async function generateMetadata(pageProps: DescriptionPageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const fallback = {
    code: "-",
    title: "Опис",
    description: "Деталі опису",
  };
  try {
    const t = await getTranslations("metadata");
    const params = await pageProps.params;
    const { openGraph } = await parent;
    const archiveCode = decodeURIComponent(params["archive-code"]);
    const fundCode = decodeURIComponent(params["fund-code"]);
    const code = decodeURIComponent(params["description-code"]);
    const description = (await getDescriptionByCode(archiveCode, fundCode, code)) || fallback;

    const name = description.title ? ` (${description.title})` : "";

    return {
      title: `${archiveCode}-${fundCode}-${code}`,
      description: t("description-description", {
        archiveCode,
        fundCode,
        descriptionCode: code,
        descriptionTitle: name,
      }),
      openGraph: {
        ...openGraph,
        type: "website",
        url: `/archives/${archiveCode}/${fundCode}/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for description page", error);
    return fallback;
  }
}

const DescriptionPage: NextPage = async () => {
  const resources = await getResources();

  return <DescriptionTable resources={resources} />;
};

export default DescriptionPage;
