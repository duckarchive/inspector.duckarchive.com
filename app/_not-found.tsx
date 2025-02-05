import ErrorDuckSrc from "@/public/images/error-duck.png";
import Image from "next/image";
import { Link } from "@heroui/link";
import { NextPage } from "next";

const NotFound: NextPage = () => {
  return (
    <div className="w-80 m-auto flex items-center flex-col">
      <p className="text-lg text-center">
        Сторінка не знайдена
        <Link href="mailto:admin@duckarchive.com" target="_blank" className="text-lg">admin@duckarchive.com</Link>
      </p>
      <Image src={ErrorDuckSrc} width={300} height={300} alt="error duck" />
      <h2 className="text-2xl font-bold">Все полагодимо 🛠️</h2>
    </div>
  );
};

export default NotFound;
