import { NextPage } from "next";
import SearchByLocation from "@/components/search-by-location";
import { getArchives } from "../../data/archives";

const SearchByLocationPage: NextPage = async () => {
  const archives = await getArchives();
  return (
    <SearchByLocation archives={archives} />
  );
};

export default SearchByLocationPage;
