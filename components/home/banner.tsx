"use client";

import { useEffect, useRef, useState } from "react";
import RoomDaySrc from "@/public/images/home/inspector-fullroom-day.webp";
import RoomNightSrc from "@/public/images/home/inspector-fullroom-night.webp";
import HatSrc from "@/public/images/home/hat.webp";
import PCSrc from "@/public/images/home/pc.webp";
import TableBooksSrc from "@/public/images/home/table-books.webp";
import TableNewsPaperSrc from "@/public/images/home/table-newspaper.webp";
import BoxSrc from "@/public/images/home/box.webp";
import HalftonePatternImg from "@/public/images/home/halftone-pattern.png";
import { useTheme } from "next-themes";
import Image from "next/image";

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
        const distance = 5;
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
        const distance = 15;
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
      <div className="absolute top-0 left-0 w-full h-[103vh] z-0">
        {/* left eye */}
        <div
          ref={eye1Ref}
          className="absolute bg-white relative flex items-center justify-center overflow-hidden"
          style={{
            width: 30,
            height: 45,
            top: "calc(-140px + 50vh)",
            left: "calc(600px + 50vw)",
            borderRadius: "15% 70% 60% 60%",
            zIndex: -1,
          }}
        >
          <div
            ref={pupil1Ref}
            className="bg-black rounded-full absolute"
            style={{ width: 18, height: 18, transform: "translate(4px, 2px)" }}
          />
        </div>

        {/* right eye */}
        <div
          ref={eye2Ref}
          className="absolute bg-white relative flex items-center justify-center overflow-hidden"
          style={{
            width: 70,
            height: 70,
            top: "calc(-205px + 50vh)",
            left: "calc(660px + 50vw)",
            borderRadius: "110% 30% 80% 60%",
            zIndex: -1,
          }}
        >
          <div
            ref={pupil2Ref}
            className="bg-black rounded-full absolute"
            style={{ width: 25, height: 25, transform: "translate(4px, 2px)" }}
          />
        </div>
        <div
          className="absolute top-0 left-0 w-full h-full opacity-90"
          style={{
            backgroundImage: `url(${theme === "dark" ? RoomNightSrc.src : RoomDaySrc.src})`,
            backgroundSize: "cover",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            maskImage: "linear-gradient(to bottom, black 100vh, transparent 103vh)",
          }}
        />
        <Image
          src={HatSrc}
          alt="Hat"
          className="absolute opacity-0 hover:opacity-100 transition-opacity duration-300 cursor-help"
          style={{
            width: 314,
            height: "auto",
            top: "calc(-317px + 50vh)",
            left: "calc(528px + 50vw)",
          }}
        />
        <Image
          src={PCSrc}
          alt="PC"
          className="absolute opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-help"
          style={{
            width: 369,
            height: "auto",
            top: "calc(-278.5px + 50vh)",
            left: "calc(113px + 50vw)",
          }}
        />
        <Image
          src={TableBooksSrc}
          alt="Table Books"
          className="absolute opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-help"
          style={{
            width: 307,
            height: "auto",
            top: "calc(70px + 50vh)",
            left: "calc(17px + 50vw)",
          }}
        />
        <Image
          src={TableNewsPaperSrc}
          alt="Table News Paper"
          className="absolute opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-help"
          style={{
            width: 382,
            height: "auto",
            top: "calc(201px + 50vh)",
            left: "calc(175px + 50vw)",
          }}
        />
        <Image
          src={BoxSrc}
          alt="Box"
          className="absolute opacity-20 hover:opacity-100 transition-opacity duration-300 cursor-help"
          style={{
            width: 127,
            height: "auto",
            top: "calc(-421px + 50vh)",
            left: "calc(-123px + 50vw)",
          }}
        />
      </div>

      <div
        className="h-[3vh] top-[100vh] left-0 w-full absolute opacity-70"
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
