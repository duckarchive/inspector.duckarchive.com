"use client";

import { useEffect, useRef } from "react";
import RoomDaySrc from "@/public/images/home/inspector-room-day.jpg";
import RoomNightSrc from "@/public/images/home/inspector-room-night.jpg";
import { useTheme } from "next-themes";

const DuckInspectorBanner: React.FC = () => {
  const eye1Ref = useRef<HTMLDivElement>(null);
  const pupil1Ref = useRef<HTMLDivElement>(null);
  const eye2Ref = useRef<HTMLDivElement>(null);
  const pupil2Ref = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const InspectorSrc = theme === "dark" ? RoomNightSrc : RoomDaySrc;

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle first eye
      if (eye1Ref.current && pupil1Ref.current) {
        const rect = eye1Ref.current.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = 7;
        const moveX = Math.cos(angle) * distance;
        const moveY = Math.sin(angle) * distance;

        pupil1Ref.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }

      // Handle second eye
      if (eye2Ref.current && pupil2Ref.current) {
        const rect = eye2Ref.current.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = 7;
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
  return (
    <>
      <div
        className="relative"
        style={{
          width: "500px",
          height: "500px",
          backgroundImage: `url(${InspectorSrc.src})`,
          backgroundSize: "auto 100%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
        }}
      >
        {/* First eye */}
        <div
          ref={eye1Ref}
          className="absolute bg-white relative flex items-center justify-center border-2 border-black overflow-hidden"
          style={{
            width: "21px",
            height: "25px",
            top: "150px",
            left: "291px",
            borderRadius: "15% 70% 60% 60%",
          }}
        >
          <div
            ref={pupil1Ref}
            className="bg-black rounded-full absolute"
            style={{ width: 14, height: 14, transform: "translate(4px, 2px)" }}
          />
        </div>

        {/* Second eye */}
        <div
          ref={eye2Ref}
          className="absolute bg-white relative flex items-center justify-center border-2 border-black overflow-hidden"
          style={{
            width: "37px",
            height: "37px",
            top: "115px",
            left: "328px",
            borderRadius: "110% 30% 80% 60%",
          }}
        >
          <div
            ref={pupil2Ref}
            className="bg-black rounded-full absolute"
            style={{ width: 14, height: 14, transform: "translate(4px, 2px)" }}
          />
        </div>
      </div>
    </>
  );
};

export default DuckInspectorBanner;
