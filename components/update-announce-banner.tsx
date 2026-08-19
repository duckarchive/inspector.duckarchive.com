"use client";

import { useEffect, useState } from "react";
import { EVENT_TIME, YOUTUBE_URL } from "@/config/update-announce";

const pad = (n: number) => String(n).padStart(2, "0");

const formatCountdown = (ms: number) => {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return days > 0
    ? `${pad(hours + days * 24)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const UpdateAnnounceBanner: React.FC = () => {
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemainingMs(EVENT_TIME - Date.now());

    tick();
    const interval = setInterval(tick, 1_000);

    return () => clearInterval(interval);
  }, []);

  if (remainingMs === null || remainingMs <= 0) {
    return null;
  }

  return (
    <a
      className="fixed z-20 top-[64px] left-1/2 -translate-x-1/2 block w-screen bg-secondary text-primary-foreground text-center text-sm md:text-base py-2 px-4 hover:opacity-90"
      href={YOUTUBE_URL}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="font-mono font-semibold">{formatCountdown(remainingMs)}</span> до Качиного Інспектора 2.0
      
    </a>
  );
};

export default UpdateAnnounceBanner;
