import { NextPage } from "next";
import { useTranslations } from "next-intl";
import SearchInput from "@/components/search-input";
import FollowingEye from "@/components/following-eye";

const WelcomePage: NextPage = () => {
  const t = useTranslations("home-page");

  return (
    <section className="flex items-center justify-between gap-4 grow">
      <div className="inline-block md:basis-1/2 justify-center">
        <h1 className="text-4xl md:text-6xl font-light">{t("title")}</h1>
        <p className="mt-4">{t("description")}</p>
        <div className="mt-8 w-full">
          <SearchInput />
        </div>
      </div>
      <div className="basis-1/2 justify-center hidden md:inline-flex">
        <FollowingEye />
      </div>
    </section>
  );
};

export default WelcomePage;
