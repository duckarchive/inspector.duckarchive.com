import Image, { StaticImageData } from "next/image";
import MessageBubble from "./message-bubble";

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

const ComicsCard: React.FC<ComicsCardProps> = ({
  image,
  message,
  type = "speech",
  va = "bottom",
  ha = "right",
  variant = "bubble",
}) => {
  return (
    <>
      <Image
        className="object-cover w-full h-full"
        src={typeof image === "string" ? image : image.src}
        alt={message}
        width={400}
        height={400}
      />
      <MessageBubble message={message} type={type} variant={variant} ha={ha} va={va} />
    </>
  );
};

ComicsCard.displayName = "ComicsCard";

export default ComicsCard;
