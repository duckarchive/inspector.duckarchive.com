import PagePanel from "@/components/page-panel";
import { NextPage } from "next";
import { getTranslations } from "next-intl/server";

const PrivacyPolicyPage: NextPage = async () => {
  const t = await getTranslations("privacy-policy-page");

  return (
    <>
      <PagePanel title={t("title")} description={t("description")} />
      <p className="text-sm text-gray-500">{t("placeholder")}</p>
    </>
  );
};

export default PrivacyPolicyPage;
