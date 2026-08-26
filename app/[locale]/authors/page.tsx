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
        description="Установи, що є фактичними авторами справ, наприклад: церква, РАЦС, прокуратура, суд, поліція тощо"
      />
      <AuthorsTable mapAuthors={mapAuthors} />
    </>
  );
};

export default AuthorsPage;
