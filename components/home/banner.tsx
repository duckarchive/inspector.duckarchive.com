"use client";

import { useEffect, useState } from "react";
import RoomDaySrc from "@/public/images/home/inspector-fullroom-day.jpg";
import RoomNightSrc from "@/public/images/home/inspector-fullroom-night.jpg";
import HalftonePatternImg from "@/public/images/home/halftone-pattern.png";
import { useTheme } from "next-themes";

const HomeBanner: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) {
    return null;
  }

  return (
    <>
      <div
        className="absolute top-0 left-0 w-full h-[110vh] opacity-90 z-0  shadow-lg"
        style={{
          backgroundImage: `url(${theme === "dark" ? RoomNightSrc.src : RoomDaySrc.src})`,
          backgroundSize: "cover",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay",
          maskImage: "linear-gradient(to bottom, black 100vh, transparent 103vh)",
        }}
      />

      <div
        className="h-[10vh] top-[100vh] left-0 w-full absolute opacity-70"
        style={{
          backgroundImage: `url("${HalftonePatternImg.src}")`,
          backgroundSize: "auto 100%",
          backgroundRepeat: "repeat-x",
        }}
      />
    </>
  );
};

export default HomeBanner;
