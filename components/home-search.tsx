"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { InputGroup, TextField } from "@heroui/react";
import { FaArrowUp, FaSearch } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import PendingButton from "@/components/pending-button";
import {
  buildSearchHref,
  extractSearchFilters,
  isPromptApiAvailable,
  titleSearchFilters,
  warmUpPromptSession,
} from "@/lib/prompt-search";

/** Real document types from the catalog, so the examples return actual results. */
const TITLE_EXAMPLES = ["київ", "шевченко", "ревізька казка", "рацс", "1921"];

/** Shown instead when the on-device parser is active — whole questions it can split into filters. */
const SMART_EXAMPLES = [
  "метричні книги Вінниця 1890-1900",
  "ревізькі казки 1858 Чернігів",
  "сповідальні відомості онлайн",
  "шевченко 1921",
];

/**
 * Covers a query against a warm session with room to spare (1–3 s measured), and
 * most of the warm-up when the user submits within seconds of the page loading.
 * Past it the title search is the better experience than a longer spinner.
 */
const EXTRACT_TIMEOUT_MS = 10000;

const TYPE_MS = 90;
const ERASE_MS = 40;
const HOLD_MS = 1800;

/** Types a phrase out, holds it, erases it, moves to the next one. */
const useTypewriter = (phrases: string[], isEnabled: boolean): string => {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(phrases[0].length);
  const [isErasing, setIsErasing] = useState(false);

  // Switching phrase sets mid-animation would index past the shorter list.
  useEffect(() => {
    setIndex(0);
    setLength(0);
    setIsErasing(false);
  }, [phrases]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const phrase = phrases[index] ?? phrases[0];

    if (!isErasing && length === phrase.length) {
      const timer = setTimeout(() => setIsErasing(true), HOLD_MS);
      return () => clearTimeout(timer);
    }
    if (isErasing && length === 0) {
      setIsErasing(false);
      setIndex((prev) => (prev + 1) % phrases.length);
      return;
    }
    const timer = setTimeout(() => setLength((prev) => prev + (isErasing ? -1 : 1)), isErasing ? ERASE_MS : TYPE_MS);
    return () => clearTimeout(timer);
  }, [phrases, index, length, isErasing, isEnabled]);

  return (phrases[index] ?? phrases[0]).slice(0, length);
};

const usePrefersReducedMotion = (): boolean => {
  const [prefersReduced, setPrefersReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return prefersReduced;
};

/** Resolves once on mount; stays false on the server and in browsers without the model. */
const usePromptApi = (): boolean => {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    isPromptApiAvailable().then((available) => {
      if (isCurrent) {
        setIsAvailable(available);
      }
    });
    return () => {
      isCurrent = false;
    };
  }, []);

  return isAvailable;
};

/**
 * Home search. With Chrome's on-device model available, the query is parsed
 * into the search page's filters (place, years, tags, archive…) before
 * navigating; otherwise — or whenever parsing fails — it is sent as a plain
 * title match, which the search page reads straight off the query string
 * (hooks/useSearch.tsx). The placeholder stays Ukrainian in every locale
 * because the catalog is.
 */
const HomeSearch: React.FC = () => {
  const t = useTranslations("home-page");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isParsing, setIsParsing] = useState(false);

  const trimmed = query.trim();
  const hasPromptApi = usePromptApi();
  const prefersReducedMotion = usePrefersReducedMotion();
  const examples = hasPromptApi ? SMART_EXAMPLES : TITLE_EXAMPLES;
  // Nothing to animate once the user is typing — the placeholder is hidden then.
  const isAnimated = !prefersReducedMotion && !query;
  const typed = useTypewriter(examples, isAnimated);

  // Session warm-up is the slow part (~10 s of on-device prefill), so it starts
  // on the first sign of intent rather than on page load: typing a query takes
  // longer than that, and visitors who never search don't pay for it.
  const handleFocus = () => {
    if (hasPromptApi) {
      warmUpPromptSession();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed || isParsing) {
      return;
    }

    let filters = null;
    if (hasPromptApi) {
      setIsParsing(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EXTRACT_TIMEOUT_MS);
      try {
        filters = await extractSearchFilters(trimmed, controller.signal);
      } finally {
        clearTimeout(timeout);
        setIsParsing(false);
      }
    }

    sendGAEvent("event", "home-search", { value: trimmed, mode: filters ? "ai" : "title" });
    router.push(buildSearchHref(filters ?? titleSearchFilters(trimmed)));
  };

  return (
    <form className="flex w-full flex-col gap-2" onSubmit={handleSubmit}>
      <TextField
        className="w-full"
        name="search-title"
        aria-label={t("search-label")}
        type="search"
        value={query}
        onChange={setQuery}
        onFocus={handleFocus}
        isDisabled={isParsing}
      >
        <InputGroup className="h-14">
          {/* Keep type="search" semantics, drop Chrome's native ✕ — the CTA is the only control here. */}
          <InputGroup.Input
            className="text-lg md:text-xl [&::-webkit-search-cancel-button]:hidden"
            placeholder={isAnimated ? `${typed}|` : examples[0]}
            autoComplete="off"
          />
          {trimmed ? (
            <InputGroup.Suffix>
              <PendingButton
                type="submit"
                size="sm"
                isIconOnly
                aria-label={t("search-button")}
                isPending={isParsing}
              >
                {hasPromptApi ? <FaArrowUp /> : <FaSearch />}
              </PendingButton>
            </InputGroup.Suffix>
          ) : null}
        </InputGroup>
      </TextField>
    </form>
  );
};

export default HomeSearch;
