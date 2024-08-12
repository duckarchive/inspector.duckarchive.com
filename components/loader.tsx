"use client";

import { Spinner } from "@nextui-org/react";

const funnyMessages = [
  "Качка може ходити, плавати і літати!",
  "Качку породи 'українська сіра' створювали на базі Українського НДІ птахівництва.",
  "Качки мають водонепроникне пір'я, що допомагає їм плавати.",
  "Качки можуть занурюватися під воду, щоб шукати їжу.",
  "Качки мають великі лапки, які допомагають їм рухатися по землі.",
  "Качки є соціальними тваринами і часто живуть у великих групах.",
  "Качки мають великі крила, які допомагають їм літати.",
];

const Loader: React.FC = () => {
  return (
    <div className="flex flex-col h-full items-center justify-center">
      <Spinner />
      <p className="mt-2 text-center" suppressHydrationWarning>
        {funnyMessages[Math.floor(Math.random() * funnyMessages.length)]}
      </p>
    </div>
  );
};

export default Loader;
