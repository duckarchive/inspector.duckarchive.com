import ArchiveTable from "@/components/archive-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "@/config/site";
import { GetArchiveResponse } from "@/app/api/archives/[archive-code]/route";

export interface ArchivePageProps {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function generateMetadata(
  pageProps: ArchivePageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const params  = await pageProps.params;
  const { openGraph } = await parent;
  const code = decodeURIComponent(params["archive-code"]);
  const archive: GetArchiveResponse = await fetch(`${siteConfig.url}/api/archives/${code}`).then((res) => res.json())
  
  return {
    title: `${code}`,
    description: `Пошук справ онлайн в архіві ${archive.code} (${archive.title})`,
    openGraph: {
      ...openGraph,
      type: "website",
      url: `/archives/${code}`,
    },
  }
}

const ArchivePage: NextPage = async () => {
  const resources = await getResources();

  return <ArchiveTable resources={resources} />;
};

export default ArchivePage;
