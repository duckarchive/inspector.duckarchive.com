import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import Search from "@/components/search";
import getTags from "@/data/tags";

const SearchPage: NextPage = async () => {
  const archives = await getArchives();
  const tags = await getTags();

  return (
    <div className="flex gap-4 grow">
      <Search archives={archives} tags={tags} />
    </div>
  );
};

export default SearchPage;
