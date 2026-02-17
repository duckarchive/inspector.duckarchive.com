import { NextPage } from "next";
import Image from "next/image";

import FriendlyDuckSrc from "@/public/images/friendly-duck.webp";

const ReportPage: NextPage = async () => {
  return (
    <div className="w-80 m-auto flex items-center flex-col">
      <p className="text-lg text-center">
        Русский? Следуй за курсом русского военного корабля с этого сайта и моей страны 🇺🇦
      </p>
      <Image src={FriendlyDuckSrc} width={300} height={300} alt="friendly duck" />
      <h2 className="text-2xl font-bold">🦆uck russians</h2>
    </div>
  );
};

export default ReportPage;
