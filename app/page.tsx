import { NextPage } from "next";
import SearchInput from "@/components/search-input";
import { getTranslations } from "next-intl/server";

const WelcomePage: NextPage = async () => {
  const t = await getTranslations('home-page');
  return (
    <section className="flex flex-col items-center justify-center gap-4 mt-8">
      <div className="inline-block max-w-2xl justify-center">
        <h1 className="text-4xl md:text-6xl font-light">{t('title')}</h1>
        <p className="mt-4">
          {t('description')}
        </p>
        <div className="mt-8 w-full">
          <SearchInput />
        </div>
      </div>
    </section>
  );
};

export default WelcomePage;
