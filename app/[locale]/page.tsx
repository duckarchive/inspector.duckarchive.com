import { NextPage } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import HomeSearch from "@/components/home-search";
import { totalRecords } from "@/data/home-stats";
import ProcessSection from "./components/home/process-section";
import StatsSection from "./components/home/stats-section";

const WelcomePage: NextPage = async () => {
  const [t, locale] = await Promise.all([getTranslations("home-page"), getLocale()]);
  const formattedTotal = new Intl.NumberFormat(locale).format(totalRecords);

  return (
    <div className="flex w-full flex-col gap-section-mobile md:gap-section mb-32">
      <section className="flex min-h-[calc(100dvh-8rem)] w-full flex-col items-center justify-center gap-4">
        <h1 className="text-4xl md:text-6xl text-center text-balance max-w-3xl tracking-tight">{t("title")}</h1>
        <div className="w-full max-w-xl">
          <HomeSearch />
        </div>
        <footer className="text-body-md opacity-50">{t("search-footer", { count: formattedTotal })}</footer>
      </section>

      <ProcessSection />
      <StatsSection />
    </div>
  );
};

export default WelcomePage;
