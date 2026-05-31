"use client";

import { useEffect, useMemo, useState } from "react";
import Image, { StaticImageData } from "next/image";

import Aru1 from "@/public/images/friends/aru_1.png";
import Aru2 from "@/public/images/friends/aru_2.png";
import Snipi1 from "@/public/images/friends/snipi_1.png";
import Snipi2 from "@/public/images/friends/snipi_2.png";
import Zd1 from "@/public/images/friends/zd_1.png";
import Zd2 from "@/public/images/friends/zd_2.png";

const COUNTDOWN_SECONDS = 30;
const SLIDE_INTERVAL_MS = 5000;

const FRIENDS: StaticImageData[] = [Aru1, Aru2, Snipi1, Snipi2, Zd1, Zd2];

interface FakeAdModalProps {
  onClose: () => void;
}

const FakeAdModal: React.FC<FakeAdModalProps> = ({ onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [activeIndex, setActiveIndex] = useState(0);
  const images = useMemo(() => [...FRIENDS].sort(() => Math.random() - 0.5), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % images.length);
    }, SLIDE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [images.length]);

  const canClose = secondsLeft <= 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <style>{`
        @keyframes fake-ad-zoom-out {
          0% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .fake-ad-zoom-out { animation: fake-ad-zoom-out 5s ease-out forwards; }
      `}</style>

      <div className="relative w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* Top bar — mimics Google Ads chrome */}
        <div className="flex items-center justify-between bg-[#f1f3f4] px-3 py-2 text-xs text-[#5f6368]">
          <div className="flex items-center gap-1">
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M3.5 12 12 3.5 20.5 12 12 20.5z M12 7 7 12l5 5 5-5z" />
            </svg>
            <span className="font-medium">Provider Ads</span>
            <span className="rounded-sm border border-[#dadce0] px-1 text-[10px] uppercase">Ad</span>
          </div>
          <button
            type="button"
            aria-label={canClose ? "Close ad" : `Skip in ${secondsLeft}`}
            disabled={!canClose}
            onClick={canClose ? onClose : undefined}
            className={`flex h-6 min-w-[2rem] items-center justify-center rounded px-2 text-xs font-medium transition-colors ${
              canClose
                ? "cursor-pointer bg-[#1a73e8] text-white hover:bg-[#1765cc]"
                : "cursor-not-allowed bg-[#e8eaed] text-[#9aa0a6]"
            }`}
          >
            {canClose ? "✕" : `${secondsLeft}`}
          </button>
        </div>

        {/* Ad creative — one image at a time */}
        <div className="relative h-[80vh] w-full overflow-hidden bg-[#f8f9fa]">
          {images.map((src, index) => (
            <Image
              key={index}
              src={src}
              alt="Advertisement"
              fill
              className={`h-full transition-opacity duration-500 ${
                index === activeIndex ? "opacity-100 fake-ad-zoom-out" : "opacity-0"
              }`}
            />
          ))}
        </div>

        <div className="border-t border-[#f1f3f4] px-4 py-2 text-center text-[10px] text-[#9aa0a6]">
          {canClose
            ? "You can now close this ad"
            : `This ad will be closeable in ${secondsLeft} second${secondsLeft === 1 ? "" : "s"}`}
        </div>
      </div>
    </div>
  );
};

export default FakeAdModal;
