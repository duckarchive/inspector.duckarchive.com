import Image, { StaticImageData } from "next/image";
import MessageBubble from "./message-bubble";
import PaperNoiseBg from "@/public/images/bg-paper-noise.png";
import { forwardRef } from "react";

export interface ComicsCardProps {
  image: StaticImageData | string;
  message: string;
  type?: "speech" | "whisper" | "electric";
  va?: "top" | "bottom";
  ha?: "left" | "right";
}

const ComicsCard = forwardRef<HTMLDivElement, ComicsCardProps>(
  ({ image, message, type = "speech", va = "bottom", ha = "right" }, ref) => {
    return (
      <div
        className="relative w-full max-w-md flex border-[16px] border-transparent min-h-96 bg-background"
        style={{ backgroundImage: `url(${PaperNoiseBg.src})` }}
        ref={ref}
      >
        <Image
          className="relative border-4 border-black rounded-sm aspect-square object-cover"
          src={typeof image === "string" ? image : image.src}
          alt={message}
          width={400}
          height={400}
        />
        <MessageBubble message={message} type={type} ha={ha} va={va} />
      </div>
    );
  },
);

ComicsCard.displayName = "ComicsCard";

export default ComicsCard;
