"use client";

import { useEffect, useState } from "react";
import { EVENT_TIME, YOUTUBE_URL } from "@/config/update-announce";

const UpdateAnnounceBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const check = () => setIsVisible(Date.now() < EVENT_TIME);

    check();
    const interval = setInterval(check, 30_000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <a
      className="fixed z-20 top-[64px] left-1/2 -translate-x-1/2 block w-screen bg-secondary text-primary-foreground text-center text-sm md:text-base py-2 px-4 hover:opacity-90"
      href={YOUTUBE_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      Велике оновлення Качиного Інспектора вже 21 серпня о 18:30 — дивіться пряму трансляцію на YouTube →
    </a>
  );
};

export default UpdateAnnounceBanner;
