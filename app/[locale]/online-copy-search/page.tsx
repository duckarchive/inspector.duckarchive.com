import { NextPage } from "next";
import OnlineCopySearch from "@/components/online-copy-search";
import { getArchives } from "@/data/archives";

interface OnlineCopySearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const OnlineCopySearchPage: NextPage<OnlineCopySearchPageProps> = async ({ searchParams }) => {
  const { q } = await searchParams;
  const archives = await getArchives();

  return <OnlineCopySearch defaultQuery={q || ""} archives={archives} />;
};

export default OnlineCopySearchPage;
