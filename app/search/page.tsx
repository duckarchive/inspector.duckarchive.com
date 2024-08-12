import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import Search from "@/components/search";
import { Suspense } from "react";
import Loader from "@/components/loader";

const SearchPage: NextPage = async () => {
  const archives = await getArchives();

  return (
    <Suspense fallback={<Loader />}>
      <Search archives={archives} />
    </Suspense>
  );
};

export default SearchPage;
