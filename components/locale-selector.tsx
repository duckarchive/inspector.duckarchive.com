"use client";

import { IoGlobe } from "react-icons/io5";
import { useLocale } from "next-intl";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import { Button } from "@heroui/button";
import { Avatar } from "@heroui/avatar";
import { SUPPORTED_LOCALES } from "@/i18n/request";

const LOCALE2FLAG: Record<string, string> = {
  uk: "ua",
  en: "us",
};

export const LocaleSelector: React.FC = () => {
  const locale = useLocale();

  const onChange = (newLocale: string) => () => {
    document.cookie = `NEXT_LOCALE=${newLocale}`;
    window.location.reload();
  };

  return (
    <Popover showArrow>
      <PopoverTrigger>
        <Button isIconOnly variant="light" size="sm" className="w-6 h-6 min-w-0" isDisabled>
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
