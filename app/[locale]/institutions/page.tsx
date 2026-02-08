import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import { getInstitutions } from "@/data/institutions";
import InstitutionsTable from "@/components/institutions-table";

const InstitutionsPage: NextPage = async () => {
  const authors = await getInstitutions();

  return (
    <>
      <PagePanel
        title="Установи"
        description="Список установ, що були авторами справ: церква, РАЦС, прокуратура, суд, поліція тощо"
      />
      <InstitutionsTable authors={authors} />
    </>
  );
};

export default InstitutionsPage;
