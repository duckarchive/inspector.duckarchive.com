import Image from "next/image";

interface MessageBubbleProps {
  variant?: "bubble" | "caption";
  message: string;
  type?: "speech" | "whisper" | "electric";
  va?: "top" | "bottom";
  ha?: "left" | "right";
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, type = "speech", variant = "bubble", va, ha }) => {
  const bubbleStyles = {
    speech: "images/message-bubble/default.svg",
    whisper: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/whisper.svg",
    electric: "https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/electric.svg",
  };

  if (variant === "caption") {
    return (
      <div
        className="text-black/70 absolute px-3 py-1 bg-white border-2 border-black font-comic text-sm leading-tight max-w-[90%] md:max-w-[70%]"
        style={{
          top: va === "top" ? -2 : undefined,
          bottom: va === "bottom" ? -2 : undefined,
          left: ha === "left" ? -2 : undefined,
          right: ha === "right" ? -2 : undefined,
        }}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      className="absolute max-w-[90%] md:max-w-[70%]"
      style={{
        transform: `scale(${ha === "left" ? 1 : -1}, ${va === "bottom" ? 1 : -1})`,
        top: va === "top" ? undefined : "0%",
        left: ha === "left" ? undefined : "0%",
        bottom: va === "bottom" ? undefined : "0%",
        right: ha === "right" ? undefined : "0%",
      }}
    >
      <div className="relative w-full h-full flex justify-center">
        <Image src={bubbleStyles[type]} width={300} height={150} alt="" className="absolute w-full h-[150%]" />
        <p
          className="leading-tight text-black text-center p-10 font-comic text-sm"
          style={{
            transform: `scale(${ha === "left" ? 1 : -1}, ${va === "bottom" ? 1 : -1})`,
          }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

export default MessageBubble;
