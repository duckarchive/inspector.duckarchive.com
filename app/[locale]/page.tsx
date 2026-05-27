import { NextPage } from "next";
import { useTranslations } from "next-intl";
import SearchInput from "@/components/search-input";
import ComicsCard, { ComicsCardProps } from "@/components/comics-card";
import ResearchImg from "@/public/images/home/research.jpg";
import ScrapImg from "@/public/images/home/scrap.jpg";
import LinkImg from "@/public/images/home/link.jpg";
import ResourcesImg from "@/public/images/home/resources.jpg";
import SupportImg from "@/public/images/home/support.jpg";
import UniverseImg from "@/public/images/home/universe.jpg";
import HomeBanner from "@/components/home/banner";
import HowToFlipbook from "@/components/how-to-flipbook";



const WelcomePage: NextPage = () => {
  const t = useTranslations("home-page");

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
      {/* <HowToFlipbook /> */}
    </>
  );
};

export default WelcomePage;
