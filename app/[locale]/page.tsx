import { NextPage } from "next";
import { useTranslations } from "next-intl";
import SearchInput from "@/components/search-input";
import FollowingEye from "@/components/following-eye";
import ComicsCard from "@/components/comics-card";
import ResearchImg from "@/public/images/home/research.jpg";

const HOW_TO_STEPS = [ResearchImg];

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
      <section className="grow">
        <h2 className="text-2xl md:text-4xl font-light">{t("how-to.title")}</h2>
        <ol className="flex gap-4 items-center list-inside">
          {[t("how-to.step1"), t("how-to.step2"), t("how-to.step3")].map((step: string, index: number) => (
            <li key={index} className="basis-1/3 h-full">
              <ComicsCard image={HOW_TO_STEPS[index]} message={step} title={`Step ${index + 1}`} />
            </li>
          ))}
        </ol>
      </section>
    </>
  );
};

export default WelcomePage;
