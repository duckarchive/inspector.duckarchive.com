import { NextPage } from "next";
import { getArchives } from "@/data/archives";
import SearchInput from "@/components/search-input";

const WelcomePage: NextPage = async () => {
  const archives = await getArchives();
  return (
    <section className="flex flex-col items-center justify-center gap-4 mt-8">
      <div className="inline-block max-w-2xl justify-center">
        <h1 className="text-4xl md:text-6xl font-light">Знайти архівну справу онлайн ― легко!</h1>
        <p className="mt-4">
          Качиний Інспектор ― це пошуковий сервіс, який дозволяє знайти архівну справу онлайн. Просто введіть реквізити
          архіву, фонду, опису та справи і отримайте посилання на джерело.
        </p>
        <div className="mt-8 w-full">
          <SearchInput />
        </div>
      </div>
    </section>
  );
};

export default WelcomePage;
