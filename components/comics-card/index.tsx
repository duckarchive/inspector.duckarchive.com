import Image, { StaticImageData } from "next/image";
import MessageBubble from "./message-bubble";
import PaperNoiseBg from "@/public/images/bg-paper-noise.png";
import { forwardRef } from "react";

export interface ComicsCardProps {
  image: StaticImageData | string;
  message: string;
  /** bubble style type (for MessageBubble). */
  type?: "speech" | "whisper" | "electric";
  /** vertical anchor for message placement */
  va?: "top" | "bottom";
  /** horizontal anchor for message placement */
  ha?: "left" | "right";
  /** render as caption (skewed box) instead of bubble */
  variant?: "bubble" | "caption";
}

const ComicsCard = forwardRef<HTMLDivElement, ComicsCardProps>(
  ({ image, message, type = "speech", va = "bottom", ha = "right", variant = "bubble" }, ref) => {
    return (
      <>
        <Image
          className="object-cover w-full h-full"
          src={typeof image === "string" ? image : image.src}
          alt={message}
          width={400}
          height={400}
        />
        {variant === "bubble" ? (
          <MessageBubble message={message} type={type} ha={ha} va={va} />
        ) : (
          <div
            className={`text-background absolute px-3 py-1 bg-white border-2 border-black text-sm ${
              va === "top" ? "-top-1" : "-bottom-1"
            } ${ha === "left" ? "-left-2" : "-right-2"} transform -skew-x-12`}
          >
            {message}
          </div>
        )}
      </>
    );
  },
);

ComicsCard.displayName = "ComicsCard";

export default ComicsCard;
