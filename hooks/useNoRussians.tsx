'use client';

import { useDonation } from "@/providers/donation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const useNoRussians = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { askForDonation } = useDonation();

  useEffect(() => {
    const lang = document.getElementsByTagName('html')[0].getAttribute('lang');
    if (lang) {
      if (lang.includes('ru')) {
        router.push("/russians-are-not-welcome");
      } else if (!lang.includes('uk')) {
        askForDonation();
      }
    }
  }, [router, pathname, askForDonation]);
};

export default useNoRussians;
