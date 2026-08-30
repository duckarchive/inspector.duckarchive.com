import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import { getMapAuthors } from "@/data/authors";
import AuthorsTable from "@/components/authors-table";
import { getTranslations } from "next-intl/server";

const AuthorsPage: NextPage = async () => {
  const t = await getTranslations("authors-page");
  const mapAuthors = await getMapAuthors();

  return (
    <>
      <PagePanel
        title={t("title")}
        description={t("description")}
      />
      <AuthorsTable mapAuthors={mapAuthors} />
    </>
  );
};

export default AuthorsPage;
