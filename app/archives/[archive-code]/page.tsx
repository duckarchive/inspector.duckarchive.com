import ArchiveTable from "@/components/archive-table";
import { Metadata, NextPage, ResolvingMetadata } from "next";
import { getResources } from "@/data/resources";
import { siteConfig } from "../../../config/site";

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
  const code = decodeURIComponent(params["archive-code"]);
  const archive = await fetch(`${siteConfig.url}/api/archives/${code}`).then((res) => res.json())
  delete archive.funds;
  return {
    description: `Справи онлайн – ${archive.title} (${archive.code})`,
  }
}

const ArchivePage: NextPage = async () => {
  const resources = await getResources();

  return <ArchiveTable resources={resources} />;
};

export default ArchivePage;
