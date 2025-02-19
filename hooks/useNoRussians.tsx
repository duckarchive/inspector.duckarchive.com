'use client';

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const useNoRussians = () => {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const lang = document.getElementsByTagName('html')[0].getAttribute('lang');
    if (lang && lang.includes('ru')) {
      router.push("/russians-are-not-welcome");
    }
  }, [router, pathname]);
};

export default useNoRussians;
