import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import Search from "@/components/search";
import getTags from "@/data/tags";

const SearchPage: NextPage = async () => {
  const archives = await getArchives();
  const tags = await getTags();

  return (
    <Search archives={archives} tags={tags} />
  );
};

export default SearchPage;
