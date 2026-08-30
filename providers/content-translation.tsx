"use client";

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import useIsMobile from "@/hooks/useIsMobile";
import { getAvailability, isTranslationApiPresent, toBcp47, translateContent } from "@/lib/translate";

const STORAGE_KEY = "duck-translate-content";

type Status = "unsupported" | "off" | "downloading" | "on";

interface ContentTranslationValue {
  /** False on mobile, non-Chromium desktop, and unsupported language pairs. */
  isOffered: boolean;
  /** BCP-47 tag translations are produced in — for the `lang` attribute. */
  targetLanguage: string;
  status: Status;
  /** 0–1 while a language pack downloads. */
  progress: number;
  /** Must be called from a user gesture — Chrome requires one to download. */
  enable: () => Promise<void>;
  disable: () => void;
  translate: (text: string) => Promise<string>;
}

const ContentTranslationContext = createContext<ContentTranslationValue | null>(null);

/**
 * Read-time translation of catalog content, on by default for foreign readers
 * whose browser already holds the language model.
 *
 * The catalog itself stays Ukrainian — this only offers foreign visitors a gist
 * of free-text titles and descriptions, computed on-device. Ukrainian speakers
 * are never shown the control.
 */
export const ContentTranslationProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const locale = useLocale();
  const isMobile = useIsMobile();
  const target = toBcp47(locale);
  const [status, setStatus] = useState<Status>("unsupported");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Nothing to translate into for Ukrainian readers. The Translator API is
    // desktop-only, so narrow viewports are opted out too — gating here rather
    // than in the button also revokes an already-on session on resize, instead
    // of leaving translation stuck on with no visible control to turn it off.
    if (locale === "uk" || isMobile || !isTranslationApiPresent()) {
      setStatus("unsupported");
      return;
    }

    let isCurrent = true;
    getAvailability(target).then((availability) => {
      if (!isCurrent) return;
      if (availability === "unavailable") {
        setStatus("unsupported");
        return;
      }
      // Translation is on by default for foreign readers, but only once the
      // model is on disk: Chrome refuses to *download* one outside a user
      // gesture, so a "downloadable" pair has to wait for the button. The
      // stored preference is tri-state — "0" is an explicit opt-out we honour,
      // absent means "never chose", which now defaults to on.
      let preference: string | null = null;
      try {
        preference = window.localStorage.getItem(STORAGE_KEY);
      } catch {
        // Private mode / blocked storage: treat as no preference.
      }
      setStatus(preference !== "0" && availability === "available" ? "on" : "off");
    });

    return () => {
      isCurrent = false;
    };
  }, [locale, isMobile, target]);

  const enable = useCallback(async () => {
    setStatus("downloading");
    try {
      // Warms the model (downloading it if needed, inside the caller's gesture)
      // so every TranslatableText that follows resolves from a ready translator.
      await translateContent("Архів", target, setProgress);
      setStatus("on");
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // Preference is a nicety; translation still works this session.
      }
    } catch {
      setStatus("off");
    } finally {
      setProgress(0);
    }
  }, [target]);

  const disable = useCallback(() => {
    setStatus("off");
    try {
      // Recorded explicitly so the default-on rule does not switch it back.
      window.localStorage.setItem(STORAGE_KEY, "0");
    } catch {
      // ignore
    }
  }, []);

  const translate = useCallback((text: string) => translateContent(text, target), [target]);

  const value = useMemo<ContentTranslationValue>(
    () => ({ isOffered: status !== "unsupported", targetLanguage: target, status, progress, enable, disable, translate }),
    [status, target, progress, enable, disable, translate],
  );

  return <ContentTranslationContext.Provider value={value}>{children}</ContentTranslationContext.Provider>;
};

export const useContentTranslation = (): ContentTranslationValue =>
  useContext(ContentTranslationContext) ?? {
    isOffered: false,
    targetLanguage: "en",
    status: "unsupported",
    progress: 0,
    enable: async () => {},
    disable: () => {},
    translate: async (text: string) => text,
  };
