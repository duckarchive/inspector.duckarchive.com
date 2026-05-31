import NotFoundSrc from "@/public/images/not-found.png";
import Image from "next/image";
import { NextPage } from "next";
import { getTranslations } from "next-intl/server";

const NotFound: NextPage = async () => {
  const translations = await getTranslations();
  return (
    <div className="h-screen m-auto flex items-center justify-center flex-col">
      <p className="text-lg text-center">{translations("not-found.title")}</p>
      <Image src={NotFoundSrc} width={500} height={500} className="absolute bottom-0 max-w-full" alt="404 duck" />
    </div>
  );
};

export default NotFound;
