"use client";

import { useTranslations } from "next-intl";
import WhosImg from "@/public/images/home/whos.jpg";
import DrManhattanImg from "@/public/images/home/dr_manhatten.jpg";
import FlashImg from "@/public/images/home/flash.jpg";
import NeoImg from "@/public/images/home/neo.jpg";
import LokiImg from "@/public/images/home/loki.jpg";
import TeamUpImg from "@/public/images/home/teamup.jpg";
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
  { image: WhosImg, message: "about.title", va: "top", ha: "right", variant: "caption" },
  { image: FlashImg, message: "about.form", va: "bottom", ha: "right", variant: "bubble" },
  { image: LokiImg, message: "about.one-place", va: "bottom", ha: "right", variant: "caption" },
  // { image: GuyFawksImg, message: "about.free", va: "top", ha: "left", variant: "bubble" },
  { image: TeamUpImg, message: "about.universe", va: "bottom", ha: "right", variant: "caption" },
  { image: NeoImg, message: "about.direct-link", va: "top", ha: "left", variant: "caption" },
  { image: DrManhattanImg, message: "about.extended-data", va: "bottom", ha: "left", variant: "caption" },
];

function Panel({ step, index }: { step: HowToStep; index: number }) {
  const basis = (() => {
    switch (index) {
      case 1:
      case 3:
        return "basis-[400px]";
      case 2:
      case 7:
        return "basis-[200px]";
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
