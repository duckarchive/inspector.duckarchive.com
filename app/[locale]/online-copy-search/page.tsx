import { NextPage } from "next";
import OnlineCopySearch from "@/components/online-copy-search";

interface OnlineCopySearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const OnlineCopySearchPage: NextPage<OnlineCopySearchPageProps> = async ({ searchParams }) => {
  const { q } = await searchParams;

  return <OnlineCopySearch defaultQuery={q || ""} />;
};

export default OnlineCopySearchPage;
