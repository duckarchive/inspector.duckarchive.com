import NotFoundDuckSrc from "@/public/images/not-found-duck.png";
import Image from "next/image";
import { NextPage } from "next";

const NotFound: NextPage = () => {
  return (
    <div className="w-80 m-auto flex items-center flex-col">
      <p className="text-lg text-center">
        Сторінка не знайдена
      </p>
      <Image src={NotFoundDuckSrc} width={300} height={300} alt="404 duck" />
    </div>
  );
};

export default NotFound;
