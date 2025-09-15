"use client";

import { useDonation } from "@/providers/donation";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addToast } from "@heroui/toast";
import { Link } from "@heroui/link";

const TO_DATE = new Date("2025-10-01T00:00:00Z");

const useNoRussians = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { askForDonation } = useDonation();
  const [lang, setLang] = useState<string | null>(null);
  const [preferredLangs, setPreferredLangs] = useState<readonly string[]>([]);

  useEffect(() => {
    if (lang) {
      if (lang.includes("ru")) {
        router.push("/russians-are-not-welcome");
      } else if (!lang.includes("uk")) {
        askForDonation();
      }
    }
  }, [router, pathname, lang, askForDonation]);

  useEffect(() => {
    if (preferredLangs.length > 0) {
      const ukPos = preferredLangs.findIndex((l) => l.startsWith("uk"));
      const ruPos = preferredLangs.findIndex((l) => l.startsWith("ru"));

      if (ukPos !== -1 && ruPos === -1) {
        // all good
        return;
      } else if (ukPos === -1 && ruPos !== -1) {
        // no ukrainian, only russian
        router.push("/russians-are-not-welcome");
      } else if (ruPos > ukPos) {
        // light ukrainization
        addToast({
          title: "🇺🇦 Лагідна українізація!",
          description: `Ви знали, що ваш браузер використовує російську мову в якості запасної?`,
          timeout: 20000,
          hideIcon: true,
          classNames: {
            base: "flex-col gap-2 items-start",
          },
          endContent: (
            <Link className="flex" size="sm" isExternal href="https://support.google.com/accounts/answer/32047?hl=uk">
              Як це виправити?
            </Link>
          ),
        });
      } else if (ukPos > ruPos) {
        // hard ukrainization
        addToast({
          title: "🇺🇦 Жорстка українізація!",
          description: `Ви надаєте перевагу російській мові над українською. Качині проєкти перестануть працювати для вас з ${TO_DATE.toLocaleDateString()}.`,
          timeout: 20000,
          hideIcon: true,
          color: "danger",
          classNames: {
            base: "flex-col gap-2 items-start",
          },
          endContent: (
            <Link className="flex" size="sm" isExternal href="https://support.google.com/accounts/answer/32047?hl=uk">
              Як це виправити?
            </Link>
          ),
        });
      }
    }
  }, [pathname, preferredLangs]);

  useEffect(() => {
    if (typeof navigator === "undefined" || typeof document === "undefined") return;
    setPreferredLangs(navigator.languages);

    const htmlElement = document.documentElement;
    setLang(htmlElement.getAttribute("lang"));

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "lang") {
          setLang(htmlElement.getAttribute("lang"));
        }
      });
    });

    observer.observe(htmlElement, {
      attributes: true, // Watch for attribute changes
      attributeFilter: ["lang"], // Only track 'lang' attribute
    });

    return () => observer.disconnect();
  }, []);
};

export default useNoRussians;
