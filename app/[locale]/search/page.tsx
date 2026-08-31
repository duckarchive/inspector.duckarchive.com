import { NextPage } from "next";
import { getTranslations } from "next-intl/server";
import { getArchives } from "@/data/archives";
import PagePanel from "@/components/page-panel";
import Search from "@/components/search";
import TranslateToggle from "@/components/translate-toggle";
import { searchVocab } from "@/data/search-vocab";

const SearchPage: NextPage = async () => {
  const t = await getTranslations("search-page");
  const archives = await getArchives();

  return (
    <>
      <PagePanel title={t("title")} description={t("description")}>
        <TranslateToggle />
      </PagePanel>
      <Search archives={archives} tags={searchVocab.tags} />
    </>
  );
};

export default SearchPage;
