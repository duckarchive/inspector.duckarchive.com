interface MessageBubbleProps {
  message: string;
  type?: "speech" | "whisper" | "electric";
  va?: "top" | "bottom";
  ha?: "left" | "right";
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, type = "speech", va, ha }) => {
  const bubbleStyles = {
    speech: "url(images/message-bubble/default.svg)",
    whisper: "url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/whisper.svg)",
    electric: "url(https://s3-us-west-2.amazonaws.com/s.cdpn.io/4273/electric.svg)",
  };

  return (
    <div
      className="absolute flex items-center justify-center pt-[10%] pb-[25%] px-8"
      style={{
        backgroundImage: bubbleStyles[type],
        transform: `scale(${ha === "left" ? 1 : -1}, ${va === "bottom" ? 1 : -1})`,
        top: va === "top" ? undefined : "-4%",
        left: ha === "left" ? undefined : "-4%",
        bottom: va === "bottom" ? undefined : "-4%",
        right: ha === "right" ? undefined : "-4%",
      }}
    >
      <p
        className="font-bold text-lg leading-tight text-gray-900 text-center"
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
