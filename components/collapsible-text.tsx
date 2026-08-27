"use client";

import { useLayoutEffect, useRef, useState } from "react";

interface CollapsibleTextProps extends React.PropsWithChildren {
  /** Visible rows while collapsed. */
  lines?: number;
  className?: string;
}

/**
 * Clamps its content to `lines` rows with an inline "show more" toggle. The
 * toggle renders only when the content actually overflows the clamp (measured,
 * and re-measured on resize), so short text stays untouched.
 */
const CollapsibleText: React.FC<CollapsibleTextProps> = ({ lines = 3, className, children }) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);

  // Measure only while collapsed: expanding removes the clamp, which would
  // read as "no overflow" and drop the button needed to collapse back.
  useLayoutEffect(() => {
    if (isExpanded) return;
    const el = contentRef.current;
    if (!el) return;
    const check = () => setIsOverflowing(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isExpanded, children]);

  return (
    <div className={className}>
      <div
        ref={contentRef}
        style={
          isExpanded
            ? undefined
            : { display: "-webkit-box", WebkitLineClamp: lines, WebkitBoxOrient: "vertical", overflow: "hidden" }
        }
      >
        {children}
      </div>
      {(isOverflowing || isExpanded) && (
        <button
          type="button"
          className="link text-xs opacity-70 hover:opacity-100"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? "Згорнути" : "Показати більше"}
        </button>
      )}
    </div>
  );
};

export default CollapsibleText;
