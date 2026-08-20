"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button, InputGroup, TextField } from "@heroui/react";
import { FaSearch } from "react-icons/fa";
import { sendGAEvent } from "@next/third-parties/google";

/** Real document types from the catalog, so the examples return actual results. */
const EXAMPLES = ["київ", "шевченко", "ревізька казка", "рацс", "клірові відомості"];

const TYPE_MS = 90;
const ERASE_MS = 40;
const HOLD_MS = 1800;

/** Types a phrase out, holds it, erases it, moves to the next one. */
const useTypewriter = (phrases: string[], isEnabled: boolean): string => {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(phrases[0].length);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }
    const phrase = phrases[index];

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

  return phrases[index].slice(0, length);
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
 * Title search. The search page reads `title` straight off the query string
 * (hooks/useSearch.tsx) and the API matches it with ILIKE %…% against file titles.
 * The placeholder stays Ukrainian in every locale because the catalog is.
 */
const HomeSearch: React.FC = () => {
  const t = useTranslations("home-page");
  const router = useRouter();
  const [title, setTitle] = useState("");

  const trimmed = title.trim();
  const prefersReducedMotion = usePrefersReducedMotion();
  // Nothing to animate once the user is typing — the placeholder is hidden then.
  const isAnimated = !prefersReducedMotion && !title;
  const typed = useTypewriter(EXAMPLES, isAnimated);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) {
      return;
    }
    sendGAEvent("event", "home-search", { value: trimmed });
    router.push(`/search?title=${encodeURIComponent(trimmed)}`);
  };

  return (
    <form className="w-full" onSubmit={handleSubmit}>
      <TextField
        className="w-full"
        name="search-title"
        aria-label={t("search-label")}
        type="search"
        value={title}
        onChange={setTitle}
      >
        <InputGroup className="h-14">
          <InputGroup.Prefix>
            <FaSearch className="text-lg text-muted pointer-events-none shrink-0" />
          </InputGroup.Prefix>
          {/* Keep type="search" semantics, drop Chrome's native ✕ — the CTA is the only control here. */}
          <InputGroup.Input
            className="text-lg md:text-xl [&::-webkit-search-cancel-button]:hidden"
            placeholder={isAnimated ? `${typed}|` : EXAMPLES[0]}
            autoComplete="off"
          />
          {trimmed ? (
            <InputGroup.Suffix>
              <Button type="submit" size="sm" className="font-bold">
                {t("search-button")}
              </Button>
            </InputGroup.Suffix>
          ) : null}
        </InputGroup>
      </TextField>
    </form>
  );
};

export default HomeSearch;
