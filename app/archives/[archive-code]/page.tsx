import ArchiveTable from "@/components/archive-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "@/config/site";
import { GetArchiveResponse } from "@/app/api/archives/[archive-code]/route";
import { getTranslations } from "next-intl/server";

export interface ArchivePageProps {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function generateMetadata(pageProps: ArchivePageProps, parent: ResolvingMetadata): Promise<Metadata> {
  const t = await getTranslations("metadata");
  const params = await pageProps.params;
  const code = decodeURIComponent(params["archive-code"]);
  const archive: GetArchiveResponse = await fetch(`${siteConfig.url}/api/archives/${code}`).then((res) => res.json());

  return {
    title: `${code}`,
    description: t("archive-description", { archiveCode: archive.code, archiveTitle: archive.title || "" }),
    openGraph: {
      type: "website",
      url: `/archives/${code}`,
    },
  };
}

const ArchivePage: NextPage = async () => {
  const resources = await getResources();

  return <ArchiveTable resources={resources} />;
};

export default ArchivePage;
