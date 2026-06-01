"use client";

import { useEffect } from "react";
import ErrorDuckSrc from "@/public/images/error.png";
import Image from "next/image";
import { Link } from "@heroui/link";

interface ErrorComponentProps {
  error: Error;
}

const ErrorComponent: React.FC<ErrorComponentProps> = ({ error }) => {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="w-80 m-auto flex items-center flex-col">
      <p className="text-lg text-center">
        Щось зламалось. Спробуйте перезавантажити сторінку або напишіть:&nbsp;
        <Link href="mailto:admin@duckarchive.com" target="_blank" className="text-lg">admin@duckarchive.com</Link>
      </p>
      <Image src={ErrorDuckSrc} width={300} height={150} alt="error duck" className="absolute bottom-0 right-0" />
    </div>
  );
};

export default ErrorComponent;
