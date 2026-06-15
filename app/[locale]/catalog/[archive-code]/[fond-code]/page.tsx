import FondTable from "@/components/fond-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { getFondByCode } from "@/app/api/catalog/[archive-code]/[fond-code]/data";
import { getTranslations } from "next-intl/server";

export interface FondPageProps {
  params: Promise<{
    "archive-code": string;
    "fond-code": string;
  }>;
}

export async function generateMetadata(pageProps: FondPageProps, parent: ResolvingMetadata): Promise<Metadata> {
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
    const code = decodeURIComponent(params["fond-code"]);
    const fond = (await getFondByCode(archiveCode, code)) || fallback;

    const name = fond.title ? ` (${fond.title})` : "";

    return {
      title: `${archiveCode}-${code}`,
      description: t("fund-description", { archiveCode, fundCode: code, fundTitle: name }),
      openGraph: {
        ...openGraph,
        type: "website",
        url: `/catalog/${archiveCode}/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for fond page", error);
    return fallback;
  }
}

const FondPage: NextPage = async () => {
  const resources = await getResources();

  return <FondTable resources={resources} />;
};

export default FondPage;
