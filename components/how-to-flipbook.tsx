"use client";

import HTMLFlipBook from "react-pageflip";
import { useTranslations } from "next-intl";
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

export default function HowToFlipbook() {
  const t = useTranslations("home-page");
  return (
    <section>
      <h2 className="text-2xl md:text-4xl p-4 md:p-8 md:pb-0 font-black italic uppercase">{t("about.title")}</h2>

      <div className="p-4 md:p-8 w-full">
        <div className="relative mx-auto max-w-4xl">
          <HTMLFlipBook width={300} height={300}>
            {HOW_TO_STEPS.map((step, i) => (
              <ComicsCard key={i} {...step} />
            ))}
          </HTMLFlipBook>
        </div>
      </div>
    </section>
  );
}
