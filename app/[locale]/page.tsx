import { NextPage } from "next";
import { useTranslations } from "next-intl";
import SearchInput from "@/components/search-input";
import FollowingEye from "@/components/following-eye";
import ComicsCard, { ComicsCardProps } from "@/components/comics-card";
import ResearchImg from "@/public/images/home/research.jpg";
import ScrapImg from "@/public/images/home/scrap.jpg";
import LinkImg from "@/public/images/home/link.jpg";
import ResourcesImg from "@/public/images/home/resources.jpg";
import SupportImg from "@/public/images/home/support.jpg";
import UniverseImg from "@/public/images/home/universe.jpg";

const HOW_TO_STEPS: ComicsCardProps[] = [
  {
    image: ScrapImg,
    message: "about.form",
    va: "top",
    ha: "left",
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
    image: UniverseImg,
    message: "about.universe",
    va: "top",
    ha: "left",
  },
  {
    image: LinkImg,
    message: "about.direct-link",
    ha: "left",
  },
];

const WelcomePage: NextPage = () => {
  const t = useTranslations("home-page");

  return (
    <>
      <section className="flex items-center justify-between flex-col md:flex-row gap-4 grow min-h-[80vh]">
        <div className="inline-block md:basis-1/2 justify-center">
          <h1 className="text-4xl md:text-6xl font-light">{t("title")}</h1>
          <p className="mt-4">{t("description")}</p>
          <div className="mt-8 w-full">
            <SearchInput />
          </div>
        </div>
        <div className="basis-1/2 flex justify-center items-center">
          <FollowingEye />
        </div>
      </section>
      <section className="grow min-h-[80vh]">
        <h2 className="text-2xl md:text-4xl font-light mb-4">{t("about.title")}</h2>
        <ol className="flex list-inside md:flex-row flex-col flex-wrap">
          {HOW_TO_STEPS.map((step, index) => (
            <li key={index} className="md:basis-1/3 h-full p-1">
              <ComicsCard image={step.image} message={t(step.message)} va={step.va} ha={step.ha} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
};

export default WelcomePage;
