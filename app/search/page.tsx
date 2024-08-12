import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import Search from "@/components/search";

const SearchPage: NextPage = async () => {
  const archives = await getArchives();

  return (
    <Search archives={archives} />
  );
};

export default SearchPage;
