"use client";

import { Link, Spinner } from "@heroui/react";

const funnyMessages = [
  "Качка може ходити, плавати і літати!",
  "Качку породи 'українська сіра' створювали на базі Українського НДІ птахівництва.",
  "Качки мають водонепроникне пір'я, що допомагає їм плавати.",
  "Качки можуть занурюватися під воду, щоб шукати їжу.",
  "Качки мають великі лапки, які допомагають їм рухатися по землі.",
  "Качки є соціальними тваринами і часто живуть у великих групах.",
  "Качки мають великі крила, які допомагають їм літати.",
  "Крякання качок не створює ехо, і ніхто точно не знає чому.",
  'У Бостоні щорічно проводять "качиний парад", де качки ходять вулицями міста.',
  "Качки можуть пірнати на глибину до 6 метрів, щоб вполювати рибу.",
  "У качок є три повіки на кожному оці для захисту під водою.",
  "У 1940-х роках у США качкам будували тунелі під дорогами.",
  "Качки можуть спати з одним відкритим оком, щоб стежити за хижаками.",
  "У давньому Китаї качок часто зображували на кераміці як символ вірності.",
  "У деяких культурах качки символізують перемогу над драконом — водною стихією.",
  "Качки можуть видавати більше 200 різних звуків для спілкування.",
  "Деякі види качок запам’ятовують маршрути міграції на все життя.",
];

interface LoaderProps {
  progress?: number;
}

const Loader: React.FC<LoaderProps> = ({ progress }) => {
  return (
    <div className="flex flex-col h-full items-center justify-center">
      <Spinner />
      <p className="mt-2 text-center" suppressHydrationWarning>
        {funnyMessages[Math.floor(Math.random() * funnyMessages.length)]}
      </p>
      {!!progress && (
        <>
          <p className="mt-2 text-center text-sm text-gray-400" suppressHydrationWarning>
            Завантаження {progress} сторінки.
          </p>
          <p className="text-center text-sm text-gray-400 w-80" suppressHydrationWarning>
            Завантаження списків на більше ніж 25,000 елементів може займати багато часу. Зручніше та швидше шукати
            конкретну справу за реквізитами <Link href="/search">на сторінці пошуку.</Link>
          </p>
        </>
      )}
    </div>
  );
};

export default Loader;
