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
import PaperNoiseBg from "@/public/images/bg-paper-noise.png";

const HOW_TO_STEPS: ComicsCardProps[] = [
  {
    image: ScrapImg,
    message: "about.form",
    va: "bottom",
  },
  {
    image: ResourcesImg,
    message: "about.one-place",
    va: "top",
    ha: "left",
  },
  {
    image: ResearchImg,
    message: "about.extended-data",
    ha: "left",
  },
  {
    image: SupportImg,
    message: "about.free",
    va: "top",
  },
  {
    image: LinkImg,
    message: "about.direct-link",
    ha: "left",
  },
  {
    image: UniverseImg,
    message: "about.universe",
    va: "top",
    ha: "left",
  },
];

const WelcomePage: NextPage = () => {
  const t = useTranslations("home-page");

  return (
    <>
      <section className="flex items-center justify-start gap-4 h-[calc(100vh-4rem)]">
        <HomeBanner />
        <div className="inline-block xl:basis-2/3 justify-center z-10 backdrop-blur-lg backdrop-saturate-150 bg-background/50 p-0 md:p-8 rounded-lg">
          <h1 className="text-4xl md:text-6xl font-light">{t("title")}</h1>
          <p className="mt-4">{t("description")}</p>
          <div className="mt-8 w-full">
            <SearchInput />
          </div>
        </div>
      </section>
      <section
        className="grow my-32 shadow-md bg-warning-200 hover:shadow-2xl transition"
        style={{
          backgroundImage: `url(${PaperNoiseBg.src})`,
        }}
      >
        <h2 className="text-2xl md:text-4xl p-4 md:p-8 md:pb-0 font-black italic uppercase">{t("about.title")}</h2>
        <ol className="flex list-inside md:flex-row flex-col flex-wrap p-4 md:p-8 w-full">
          {HOW_TO_STEPS.map((step, index) => (
            <li key={index} className="lg:basis-1/3 h-full">
              <ComicsCard image={step.image} message={t(step.message)} va={step.va} ha={step.ha} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
};

export default WelcomePage;
