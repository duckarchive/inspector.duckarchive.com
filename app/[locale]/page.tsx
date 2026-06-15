import { NextPage } from "next";
import { getTranslations } from "next-intl/server";
import SearchInput from "@/components/search-input";
import HomeBanner from "@/components/home/banner";
import ComicsPage from "@/components/comics-page";



const WelcomePage: NextPage = async () => {
  const t = await getTranslations("home-page");

  return (
    <>
      <section className="flex items-center justify-start gap-4 h-[calc(100vh-4rem)]">
        <HomeBanner />
        <div className="inline-block xl:basis-2/3 justify-center z-10 backdrop-blur-lg backdrop-saturate-150 bg-background/50 p-4 md:p-8 rounded-lg">
          <h1 className="text-4xl md:text-6xl font-light">{t("title")}</h1>
          <p className="mt-4">{t("description")}</p>
          <div className="mt-8 w-full">
            <SearchInput />
          </div>
        </div>
      </section>
      <ComicsPage />
    </>
  );
};

export default WelcomePage;
