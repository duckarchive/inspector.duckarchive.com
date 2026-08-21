import ArchiveTable from "@/components/archive-table";
import { Metadata, NextPage } from "next";
import { getCatalogArchiveByCode } from "@/app/api/catalog/[archive-code]/data";
import { getTranslations } from "next-intl/server";

export interface ArchivePageProps {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function generateMetadata(pageProps: ArchivePageProps): Promise<Metadata> {
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
        url: `/archives/${code}`,
      },
    };
  } catch (error) {
    console.log("failed to generate metadata for archive page", error);
    return fallback;
  }
}

const ArchivePage: NextPage = async () => {
  return <ArchiveTable />;
};

export default ArchivePage;
