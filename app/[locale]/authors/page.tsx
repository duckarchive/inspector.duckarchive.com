import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import { getMapAuthors } from "@/data/authors";
import AuthorsTable from "@/components/authors-table";

const AuthorsPage: NextPage = async () => {
  const mapAuthors = await getMapAuthors();

  return (
    <>
      <PagePanel
        title="Автори"
        description="Список установ, що були авторами справ: церква, РАЦС, прокуратура, суд, поліція тощо"
      />
      <AuthorsTable mapAuthors={mapAuthors} />
    </>
  );
};

export default AuthorsPage;
