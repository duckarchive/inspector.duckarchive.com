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
 * Read-time translation of catalog content, off by default.
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
      // Restore the reader's preference, but only when the model is already on
      // disk — resuming a download needs a gesture we do not have on load.
      let remembered = false;
      try {
        remembered = window.localStorage.getItem(STORAGE_KEY) === "1";
      } catch {
        // Private mode / blocked storage: fall back to off.
      }
      setStatus(remembered && availability === "available" ? "on" : "off");
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
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const translate = useCallback((text: string) => translateContent(text, target), [target]);

  const value = useMemo<ContentTranslationValue>(
    () => ({ isOffered: status !== "unsupported", status, progress, enable, disable, translate }),
    [status, progress, enable, disable, translate],
  );

  return <ContentTranslationContext.Provider value={value}>{children}</ContentTranslationContext.Provider>;
};

export const useContentTranslation = (): ContentTranslationValue =>
  useContext(ContentTranslationContext) ?? {
    isOffered: false,
    status: "unsupported",
    progress: 0,
    enable: async () => {},
    disable: () => {},
    translate: async (text: string) => text,
  };
