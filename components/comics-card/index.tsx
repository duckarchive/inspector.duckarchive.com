import { StaticImageData } from "next/image";
import MessageBubble from "./message-bubble";

export interface ComicsCardProps {
  image: StaticImageData | string;
  message: string;
  type?: "speech" | "whisper" | "electric";
  va?: "top" | "bottom";
  ha?: "left" | "right";
}

export default function ComicsCard({ image, message, type = "speech", va = "bottom", ha = "right" }: ComicsCardProps) {
  return (
    <div className="relative w-full max-w-md bg-white rounded-2xl border-[16px] border-white shadow-lg">
      <div
        className="relative p-6 from-sky-300 to-sky-200 min-h-96 flex flex-col justify-between border-4 border-black rounded-sm"
        style={{
          backgroundImage: `url(${typeof image === "string" ? image : image?.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <MessageBubble message={message} type={type} ha={ha} va={va} />
      </div>

      {/* <div className="bg-white px-6 py-4">
        <h3 className="font-bold text-xl text-gray-900">{title}</h3>
      </div> */}
    </div>
  );
}
