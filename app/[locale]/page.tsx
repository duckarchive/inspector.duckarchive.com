import { NextPage } from "next";
import { getTranslations } from "next-intl/server";
import HomeSearch from "@/components/home-search";
import ProcessSection from "./components/home/process-section";

const WelcomePage: NextPage = async () => {
  const t = await getTranslations("home-page");

  return (
    <div className="flex w-full flex-col gap-section-mobile md:gap-section">
      <section className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-center gap-8">
        <h1 className="text-4xl md:text-6xl text-center text-balance max-w-3xl tracking-tight">{t("title")}</h1>
        <div className="w-full max-w-xl">
          <HomeSearch />
        </div>
      </section>

      <ProcessSection />
    </div>
  );
};

export default WelcomePage;
