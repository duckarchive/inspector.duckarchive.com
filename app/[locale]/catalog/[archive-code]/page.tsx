import CatalogArchiveTable from "@/components/catalog-archive-table";
import { Metadata, NextPage } from "next";
import { getResources } from "@/data/resources";
import { getCatalogArchiveByCode } from "@/app/api/catalog/[archive-code]/data";
import { getTranslations } from "next-intl/server";

export interface CatalogArchivePageProps {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function generateMetadata(pageProps: CatalogArchivePageProps): Promise<Metadata> {
  const fallback = {
    code: "-",
    title: "Архів",
    description: "Деталі архіву",
  };
  try {
    const t = await getTranslations("metadata");
    const params = await pageProps.params;
    const code = decodeURIComponent(params["archive-code"]);
    const archive = (await getCatalogArchiveByCode(code)) || fallback;

    return {
      title: `${code}`,
      description: t("archive-description", { archiveCode: archive.code, archiveTitle: archive.title || "" }),
      openGraph: {
        type: "website",
        url: `/catalog/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for catalog archive page", error);
    return fallback;
  }
}

const CatalogArchivePage: NextPage = async () => {
  const resources = await getResources();

  return <CatalogArchiveTable resources={resources} />;
};

export default CatalogArchivePage;
