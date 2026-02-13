"use client";

import { useEffect, useRef } from "react";
import InspectorSrc from "@/public/images/inspector.png";
import Image from "next/image";

export default function FollowingEye() {
  const eyeRef = useRef<HTMLDivElement>(null);
  const pupilRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!eyeRef.current || !pupilRef.current) return;

      // Get the center of the eye
      const rect = eyeRef.current.getBoundingClientRect();
      const eyeX = rect.left + rect.width / 2;
      const eyeY = rect.top + rect.height / 2;

      // Calculate angle between mouse and eye center
      const angle = Math.atan2(e.clientY - eyeY, e.clientX - eyeX);

      // Distance the pupil should move (keep it inside the eye)
      const distance = 20;
      const moveX = Math.cos(angle) * distance;
      const moveY = Math.sin(angle) * distance;

      pupilRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative aspect-square w-full">
      {/* <div
        ref={eyeRef}
        className="absolute w-[10%] h-[12%] top-[45%] left-[25%] bg-white rounded-full relative flex items-center justify-center border-2 border-black"
      >
        <div ref={pupilRef} className="w-[10%] h-[10%] bg-black rounded-full absolute" />
      </div> */}
      <Image src={InspectorSrc} width={300} height={300} alt="inspector" />
    </div>
  );
}
