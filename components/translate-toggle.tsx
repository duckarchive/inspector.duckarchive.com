"use client";

import { Button, Tooltip } from "@heroui/react";
import { useTranslations } from "next-intl";
import { FaLanguage } from "react-icons/fa";
import { useContentTranslation } from "@/providers/content-translation";

/**
 * Opt-in control for machine-translating catalog text. Hidden entirely when the
 * browser cannot do it (all mobile, non-Chromium desktop) or for uk readers.
 *
 * The press doubles as the user gesture Chrome requires before it will download
 * a language pack, so enabling must happen here rather than automatically.
 */
const TranslateToggle: React.FC = () => {
  const t = useTranslations("content-translation");
  const { isOffered, status, progress, enable, disable } = useContentTranslation();

  if (!isOffered) return null;

  const isBusy = status === "downloading";
  const isOn = status === "on";

  return (
    <Tooltip delay={300}>
      <Tooltip.Trigger>
        <Button
          size="sm"
          variant={isOn ? "secondary" : "outline"}
          isDisabled={isBusy}
          aria-pressed={isOn}
          isIconOnly
          onPress={() => (isOn ? disable() : enable())}
        >
          <FaLanguage />
          {isBusy
            ? t("downloading", { percent: Math.round(progress * 100) })
            : null}
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement="bottom">
        <Tooltip.Arrow />
        <span className="text-sm">{t("hint")}</span>
      </Tooltip.Content>
    </Tooltip>
  );
};

export default TranslateToggle;
