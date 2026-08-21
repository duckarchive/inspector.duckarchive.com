import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import Search from "@/components/search";
import { searchVocab } from "@/data/search-vocab";

const SearchPage: NextPage = async () => {
  const archives = await getArchives();

  return <Search archives={archives} tags={searchVocab.tags} />;
};

export default SearchPage;
