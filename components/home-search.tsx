"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { InputGroup, TextField } from "@heroui/react";
import { FaSearch } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";
import qs from "qs";
import PendingButton from "@/components/pending-button";
import { hasLatin, toCyrillicQuery } from "@/lib/translit";

/**
 * Fallback examples if the locale's `home-page.search-examples` list is
 * missing. The per-locale lists live in messages/*.json; every entry must
 * transliterate to an EXACT catalog term via toCyrillicQuery (verify with
 * lib/translit.ts before editing), so typing an example returns real results.
 */
const TITLE_EXAMPLES = ["київ", "шевченко", "ревізька казка", "рацс", "1921"];

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

/**
 * Home search. The query is sent as a plain title match, which the search
 * page reads straight off the query string (hooks/useSearch.tsx). The
 * animated placeholder examples are per-locale (Latin for foreign locales —
 * the transliteration layer turns them into the exact Cyrillic catalog terms).
 */
const HomeSearch: React.FC = () => {
  const t = useTranslations("home-page");
  const tSearch = useTranslations("search-page");
  const locale = useLocale();
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Memoized: useTypewriter resets its animation whenever the array identity
  // changes, so a fresh array per render would freeze it at zero length.
  const examples = useMemo(() => {
    const raw = t.raw("search-examples");
    return Array.isArray(raw) && raw.length > 0 ? raw.map(String) : TITLE_EXAMPLES;
  }, [t]);

  const trimmed = query.trim();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Nothing to animate once the user is typing — the placeholder is hidden then.
  const isAnimated = !prefersReducedMotion && !query;
  const typed = useTypewriter(examples, isAnimated);

  // The catalog is Cyrillic-only and the API rejects Latin letters, so a
  // Latin query is transliterated before it is sent — and previewed below the
  // box while typing, so the conversion is never a surprise.
  const converted = trimmed && hasLatin(trimmed) ? toCyrillicQuery(trimmed, locale) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      return;
    }

    const title = converted ?? trimmed;
    sendGAEvent("event", "home-search", { value: title });
    router.push(`/search?${qs.stringify({ title }, { skipNulls: true })}`);
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
              <PendingButton type="submit" size="sm" isIconOnly aria-label={t("search-button")}>
                <FaSearch />
              </PendingButton>
            </InputGroup.Suffix>
          ) : null}
        </InputGroup>
      </TextField>
      {converted ? (
        <p className="text-xs opacity-60 px-1">{tSearch("translit-hint", { query: converted })}</p>
      ) : null}
    </form>
  );
};

export default HomeSearch;
