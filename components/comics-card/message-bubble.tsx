interface MessageBubbleProps {
  variant?: "bubble" | "caption";
  message: string;
  type?: "speech" | "whisper" | "electric";
  va?: "top" | "bottom";
  ha?: "left" | "right";
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, type = "speech", variant = "bubble", va, ha }) => {
  const bubbleStyles = {
    speech: "url(images/message-bubble/default.svg)",
    whisper: "url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/whisper.svg)",
    electric: "url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/electric.svg)",
  };

  if (variant === "caption") {
    return (
      <div
      className="text-black absolute px-3 py-1 bg-white border-2 border-black leading-tight"
      style={{
          top: va === "top" ? "-1%" : undefined,
          bottom: va === "bottom" ? "-1%" : undefined,
          left: ha === "left" ? "-1%" : undefined,
          right: ha === "right" ? "-1%" : undefined,
        }}
      >
        {message}
      </div>
    );
  }

  return (
    <div
      className="absolute flex items-center justify-center pt-[10%] pb-[25%] px-8"
      style={{
        backgroundImage: bubbleStyles[type],
        transform: `scale(${ha === "left" ? 1 : -1}, ${va === "bottom" ? 1 : -1})`,
        top: va === "top" ? undefined : "-2%",
        left: ha === "left" ? undefined : "-2%",
        bottom: va === "bottom" ? undefined : "-2%",
        right: ha === "right" ? undefined : "-2%",
      }}
    >
      <p
        className="leading-tight text-black text-center"
        style={{
          transform: `scale(${ha === "left" ? 1 : -1}, ${va === "bottom" ? 1 : -1})`,
        }}
      >
        {message}
      </p>
    </div>
  );
};

export default MessageBubble;
