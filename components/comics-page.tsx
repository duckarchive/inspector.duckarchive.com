"use client";

import { useTranslations } from "next-intl";
import WhosImg from "@/public/images/home/whos.jpg";
import ResearchImg from "@/public/images/home/research.jpg";
import ScrapImg from "@/public/images/home/scrap.jpg";
import LinkImg from "@/public/images/home/link.jpg";
import ResourcesImg from "@/public/images/home/resources.jpg";
import SupportImg from "@/public/images/home/support.jpg";
import UniverseImg from "@/public/images/home/universe.jpg";
import ComicsCard from "@/components/comics-card";
import { StaticImageData } from "next/image";

interface HowToStep {
  image: StaticImageData | string;
  message: string;
  va: "top" | "bottom";
  ha: "left" | "right";
  type?: "speech" | "whisper" | "electric";
  variant?: "bubble" | "caption";
}

const HOW_TO_STEPS: HowToStep[] = [
  { image: WhosImg, message: "about.title", va: "top", ha: "left", variant: "caption" },
  { image: ScrapImg, message: "about.form", va: "top", ha: "left", variant: "caption" },
  { image: ResourcesImg, message: "about.one-place", va: "bottom", ha: "right", variant: "caption" },
  { image: ResearchImg, message: "about.extended-data", va: "top", ha: "right", variant: "caption" },
  { image: SupportImg, message: "about.free", va: "top", ha: "right", variant: "bubble" },
  { image: LinkImg, message: "about.direct-link", va: "top", ha: "left", variant: "caption" },
  { image: UniverseImg, message: "about.universe", va: "bottom", ha: "left", variant: "bubble" },
];

function Panel({ step, index }: { step: HowToStep; index: number }) {
  const basis = (() => {
    switch (index) {
      case 1:
      case 3:
        return "basis-[400px]";
      default:
        return "basis-[300px]";
    }
  })();

  return (
    <div className={`panel relative ${basis} flex-1 overflow-hidden border-2 border-black rounded-sm`}>
      <ComicsCard
        image={step.image}
        message={step.message}
        variant={step.variant}
        type={step.type}
        va={step.va}
        ha={step.ha}
      />
    </div>
  );
}

export default function ComicsPage() {
  const t = useTranslations("home-page");

  const steps = HOW_TO_STEPS.map((s) => ({ ...s, message: t(s.message) }));

  return (
    <section className="py-48">
      <div className="comic flex flex-wrap gap-2">
        {steps.map((step, i) => (
          <Panel key={i} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
