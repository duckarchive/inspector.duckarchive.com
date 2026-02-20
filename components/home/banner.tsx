"use client";

import { useEffect, useMemo, useState } from "react";
import RoomDaySrc from "@/public/images/home/inspector-fullroom-day.jpg";
import RoomNightSrc from "@/public/images/home/inspector-fullroom-night.jpg";
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
    <div
      className="absolute top-0 left-0 w-screen h-screen opacity-90 z-0"
      style={{
        backgroundImage: `url(${theme === "dark" ? RoomNightSrc.src : RoomDaySrc.src})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }}
    />
  );
};

export default HomeBanner;
