"use client";

import { useEffect, useRef, useState } from "react";
import RoomDaySrc from "@/public/images/home/day.webp";
import RoomNightSrc from "@/public/images/home/night.webp";
import HalftonePatternImg from "@/public/images/home/halftone-pattern.png";
import { useTheme } from "next-themes";

const HomeBanner: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const eye1Ref = useRef<HTMLDivElement>(null);
  const pupil1Ref = useRef<HTMLDivElement>(null);
  const eye2Ref = useRef<HTMLDivElement>(null);
  const pupil2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle left eye
      if (eye1Ref.current && pupil1Ref.current) {
        const rect = eye1Ref.current.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = 8;
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;

        pupil1Ref.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }

      // Handle right eye
      if (eye2Ref.current && pupil2Ref.current) {
        const rect = eye2Ref.current.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = 10;
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;

        pupil2Ref.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <>
      <div className="absolute top-0 left-0 w-full h-[103vh] z-0 overflow-hidden">
        <div id="eyes" className="absolute flex items-end gap-6" style={{
          top: 'calc(50% - 190px)',
          left: 'calc(50% + 665px)',
          height: '80px',
          width: '135px',
          zIndex: -1,
        }}>
          {/* left eye */}
          <div
            ref={eye1Ref}
            className="bg-white relative flex w-1/5 h-2/3 mb-1 items-center justify-center overflow-hidden"
            style={{
              borderRadius: "15% 70% 60% 60%",
            }}
          >
            <div
              ref={pupil1Ref}
              className="bg-black rounded-full absolute"
              style={{ width: 15, height: 15, transform: "translate(4px, 2px)" }}
            />
          </div>

          {/* right eye */}
          <div
            ref={eye2Ref}
            className="bg-white relative flex grow-[2] h-full items-center justify-center overflow-hidden"
            style={{
              borderRadius: "110% 30% 80% 60%",
            }}
          >
            <div
              ref={pupil2Ref}
              className="bg-black rounded-full absolute"
              style={{ width: 25, height: 25, transform: "translate(4px, 2px)" }}
            />
          </div>
        </div>
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            backgroundImage: `url(${theme === "dark" ? RoomNightSrc.src : RoomDaySrc.src})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            // maskImage: "linear-gradient(to bottom, black 100vh, transparent 103vh)",
            maskImage: `linear-gradient(to bottom, black), url("${HalftonePatternImg.src}")`,
            maskSize: "auto 97.1%, auto 4%",
            maskRepeat: "no-repeat,repeat-x",
            maskPosition: "top center, center bottom",
          }}
        />
      </div>
    </>
  );
};

export default HomeBanner;
