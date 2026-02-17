"use client";

import { useEffect, useRef } from "react";
import InspectorSrc from "@/public/images/inspector.png";

export default function FollowingEye() {
  const eye1Ref = useRef<HTMLDivElement>(null);
  const pupil1Ref = useRef<HTMLDivElement>(null);
  const eye2Ref = useRef<HTMLDivElement>(null);
  const pupil2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Handle first eye
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

      // Handle second eye
      if (eye2Ref.current && pupil2Ref.current) {
        const rect = eye2Ref.current.getBoundingClientRect();
        const eyeX = rect.left + rect.width / 2;
        const eyeY = rect.top + rect.height / 2;

        const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);
        const distance = 5;
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
    <div
      className="relative"
      style={{
        width: "300px",
        height: "300px",
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
          width: "12px",
          height: "21px",
          top: "53px",
          left: "120px",
          borderRadius: "80% 50% 90% 50%",
        }}
      >
        <div
          ref={pupil1Ref}
          className="bg-black rounded-full absolute"
          style={{ width: "10px", height: "10px", transform: "translate(4px, 2px)" }}
        />
      </div>

      {/* Second eye */}
      <div
        ref={eye2Ref}
        className="absolute bg-white relative flex items-center justify-center border-2 border-black overflow-hidden"
        style={{
          width: "18px",
          height: "21px",
          top: "33px",
          left: "146px",
          borderRadius: "80% 50% 90% 50%",
        }}
      >
        <div
          ref={pupil2Ref}
          className="bg-black rounded-full absolute"
          style={{ width: "10px", height: "10px", transform: "translate(4px, 2px)" }}
        />
      </div>
    </div>
  );
}
