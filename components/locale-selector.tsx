"use client";

import { IoGlobe } from "react-icons/io5";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/i18n/request";

const LOCALE2FLAG: Record<string, string> = {
  uk: "ua",
  en: "us",
  es: "es",
  it: "it",
  pl: "pl",
  ro: "ro",
  cz: "cz",
};

export const LocaleSelector: React.FC = () => {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const onChange = (newLocale: string) => () => {
    // Remove current locale prefix from pathname if it exists
    let newPathname = pathname;
    if (locale !== DEFAULT_LOCALE) {
      newPathname = pathname.replace(`/${locale}`, "") || "/";
    }

    // Add new locale prefix if it's not the default locale
    if (newLocale !== DEFAULT_LOCALE) {
      newPathname = `/${newLocale}${newPathname}`;
    }

    router.push(newPathname);
  };

  return (
    <Popover showArrow>
      <PopoverTrigger>
        <Button isIconOnly variant="light" size="sm" className="w-6 h-6 min-w-0">
          <IoGlobe className="w-6 h-6 block fill-current text-default-500" />
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        {SUPPORTED_LOCALES.map((code) => (
          <Button
            key={code}
            onPress={onChange(code)}
            size="md"
            variant={code === locale ? "ghost" : "light"}
            startContent={<Avatar src={`https://flagcdn.com/${LOCALE2FLAG[code] || code}.svg`} className="w-6 h-6" />}
          >
            {code.toUpperCase()}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
};
