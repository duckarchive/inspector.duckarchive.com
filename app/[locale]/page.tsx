import { NextPage } from "next";
import { getTranslations } from "next-intl/server";
import HomeSearch from "@/components/home-search";

const WelcomePage: NextPage = async () => {
  const t = await getTranslations("home-page");

  return (
    <section className="flex flex-col items-center justify-center gap-8 min-h-[calc(100vh-8rem)] w-full">
      <h1 className="text-4xl md:text-6xl text-center text-balance max-w-3xl tracking-tight">{t("title")}</h1>
      <div className="w-full max-w-xl">
        <HomeSearch />
      </div>
    </section>
  );
};

export default WelcomePage;
