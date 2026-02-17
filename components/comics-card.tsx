import Image from "next/image";
import { StaticImageData } from "next/image";

interface ComicsCardProps {
  image: StaticImageData | string;
  message: string;
  title: string;
}

export default function ComicsCard({ image, message, title }: ComicsCardProps) {
  return (
    <div className="relative w-full max-w-md bg-white rounded-2xl border-[16px] border-white shadow-lg overflow-hidden">
      {/* Main content area */}
      <div
        className="relative p-6 from-sky-300 to-sky-200 min-h-96 flex flex-col justify-between border-4 border-black rounded-sm"
        style={{
          backgroundImage: `url(${typeof image === "string" ? image : image?.src})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Speech bubble */}
        <div className="relative mb-8">
          <div className="bg-white rounded-[50%] border-4 border-black p-6 shadow-md">
            <p className="font-bold text-lg leading-tight text-gray-900">{message}</p>
          </div>
          {/* Speech bubble tail */}
          <div className="absolute bottom-2 right-8 w-0 h-0 border-l-8 border-l-white border-t-8 border-t-white border-r-8 border-r-transparent border-b-8 border-b-transparent transform translate-y-1" />
        </div>
      </div>

      {/* Footer with title */}
      <div className="bg-white px-6 py-4">
        <h3 className="font-bold text-xl text-gray-900">{title}</h3>
      </div>
    </div>
  );
}
