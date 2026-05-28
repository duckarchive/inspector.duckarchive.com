"use client";

import { useTranslations } from "next-intl";
import ResearchImg from "@/public/images/home/research.jpg";
import ScrapImg from "@/public/images/home/scrap.jpg";
import LinkImg from "@/public/images/home/link.jpg";
import ResourcesImg from "@/public/images/home/resources.jpg";
import SupportImg from "@/public/images/home/support.jpg";
import UniverseImg from "@/public/images/home/universe.jpg";
import ComicsCard from "@/components/comics-card";

const HOW_TO_STEPS: {
  image: any;
  message: string;
  va: "top" | "bottom";
  ha: "left" | "right";
  type?: "speech" | "whisper" | "electric";
  variant?: "bubble" | "caption";
}[] = [
  { image: ScrapImg, message: "about.form", va: "top", ha: "left", variant: "caption" },
  { image: ResourcesImg, message: "about.one-place", va: "bottom", ha: "right", variant: "caption" },
  { image: ResearchImg, message: "about.extended-data", va: "top", ha: "right", variant: "caption" },
  { image: SupportImg, message: "about.free", va: "top", ha: "right", variant: "bubble" },
  { image: LinkImg, message: "about.direct-link", va: "top", ha: "left", variant: "caption" },
  { image: UniverseImg, message: "about.universe", va: "bottom", ha: "left", variant: "bubble" },
];

function Panel({ step, index }: { step: any; index: number }) {
  const basis = (() => {
    switch (index) {
      case 0:
      case 2:
      case 3:
        return "basis-[400px]";
      default:
        return "basis-[200px]";
    }
  })();

  return (
    <div className={`panel relative ${basis} flex-1 overflow-hidden border-2 border-black rounded-sm`}>
      <ComicsCard
        image={step.image}
        message={step.messageText}
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

  const steps = HOW_TO_STEPS.map((s) => ({ ...s, messageText: t(s.message) }));

  return (
    <section className="py-12">
      <h2 className="text-2xl md:text-4xl font-black italic uppercase mb-2">{t("about.title")}</h2>

      <div className="comic flex flex-wrap gap-1">
        {steps.map((step, i) => (
          <Panel key={i} step={step} index={i} />
        ))}
      </div>
    </section>
  );
}
