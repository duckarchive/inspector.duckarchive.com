"use client";

import { useEffect, useRef, useState } from "react";
import { ResourceType } from "@generated/prisma/client/enums";
import { TYPE_CHIP_CLASS, TYPE_LABEL } from "@/components/resource-badge";

const RESOURCE_ORDER: ResourceType[] = [
  ResourceType.ARCHIUM,
  ResourceType.FAMILY_SEARCH,
  ResourceType.WIKIPEDIA,
  ResourceType.BABYN_YAR,
  ResourceType.WEBSITE,
  ResourceType.GOOGLE_DRIVE,
];

/** What Duck Inspector actually does with what it pulls in — real product surfaces, not translated
 *  like TYPE_LABEL above: archival vocabulary stays Ukrainian across every locale in this app. */
const OUTPUT_LABELS = ["Каталоги", "Описи", "OCR", "Робота спільноти", "ШІ"];

/** Solid categorical fill per resource, lifted from TYPE_CHIP_CLASS (`bg-[#hex] text-white`). */
const RESOURCE_COLOR: Record<ResourceType, string> = Object.fromEntries(
  RESOURCE_ORDER.map((type) => [type, TYPE_CHIP_CLASS[type].match(/#[0-9a-f]{6}/i)?.[0] ?? "#5a4136"])
) as Record<ResourceType, string>;

const DUCK_POS = { x: 50, y: 50 };
/** Below this container width, a single row of labels starts to collide — split into two rows. */
const COMPACT_BREAKPOINT = 560;

type Point = { x: number; y: number };

/** Evenly spaces `items` across one row at `y`, or across two rows of up to 3 when `compact`. */
const rowLayout = <T,>(items: T[], y: { single: number; row1: number; row2: number }, compact: boolean): Point[] => {
  if (!compact || items.length <= 3) {
    const n = items.length;
    return items.map((_, i) => ({ x: ((i + 1) / (n + 1)) * 100, y: y.single }));
  }
  const mid = Math.ceil(items.length / 2);
  return items.map((_, i) => {
    const inRow1 = i < mid;
    const rowItems = inRow1 ? mid : items.length - mid;
    const indexInRow = inRow1 ? i : i - mid;
    return { x: ((indexInRow + 1) / (rowItems + 1)) * 100, y: inRow1 ? y.row1 : y.row2 };
  });
};

interface FlowNodeProps {
  label: string;
  pos: Point;
  className: string;
  truncate: boolean;
  color?: string;
}

const FlowNode: React.FC<FlowNodeProps> = ({ label, pos, className, truncate, color }) => (
  <div
    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
    style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
  >
    <span
      className={`rounded-md bg-background px-2 py-1 ${className} ${truncate ? "block max-w-28 truncate" : "whitespace-nowrap"}`}
      style={color ? { color } : undefined}
    >
      {label}
    </span>
  </div>
);

/**
 * A small flow diagram: resource sources feed into the Duck Inspector node,
 * which in turn feeds the outputs it produces — all wired with animated
 * flow lines. Positions are kept in percent so the layout stays correct
 * across resizes; only the SVG paths are converted to pixels.
 */
const ProcessDiagram: React.FC<{ duckLabel: string }> = ({ duckLabel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPrefersReducedMotion(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const isCompact = size.width > 0 && size.width < COMPACT_BREAKPOINT;
  const inputPositions = rowLayout(RESOURCE_ORDER, { single: 10, row1: 8, row2: 26 }, isCompact);
  const outputPositions = rowLayout(OUTPUT_LABELS, { single: 90, row1: 74, row2: 92 }, isCompact);

  const toPx = (pt: Point) => ({ x: (pt.x / 100) * size.width, y: (pt.y / 100) * size.height });

  const flowPath = (from: Point, to: Point) => {
    const a = toPx(from);
    const b = toPx(to);
    const midY = (a.y + b.y) / 2;
    return `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`;
  };

  return (
    <div
      ref={containerRef}
      className="bg-dotted relative h-[520px] w-full overflow-hidden rounded-xl border border-border bg-surface"
    >
      {size.width > 0 && (
        <svg className="absolute inset-0" height={size.height} width={size.width}>
          {RESOURCE_ORDER.map((type, i) => {
            const d = flowPath(inputPositions[i], DUCK_POS);
            return (
              <g key={type}>
                <path d={d} fill="none" style={{ stroke: "var(--border)" }} strokeWidth={1.5} />
                <path
                  className={prefersReducedMotion ? undefined : "duck-flow-pulse"}
                  d={d}
                  fill="none"
                  stroke={RESOURCE_COLOR[type]}
                  strokeDasharray="1 13"
                  strokeLinecap="round"
                  strokeWidth={3}
                  style={{ animationDelay: `${i * -0.4}s` }}
                />
              </g>
            );
          })}
          {OUTPUT_LABELS.map((label, i) => {
            const d = flowPath(DUCK_POS, outputPositions[i]);
            // Pulse travels the opposite way of the base line — up into Duck Inspector,
            // not down out of it — so it needs its own path drawn output-first.
            const dPulse = flowPath(outputPositions[i], DUCK_POS);
            return (
              <g key={label}>
                <path d={d} fill="none" style={{ stroke: "var(--border)" }} strokeWidth={1.5} />
                <path
                  className={prefersReducedMotion ? undefined : "duck-flow-pulse"}
                  d={dPulse}
                  fill="none"
                  style={{ stroke: "var(--accent)", animationDelay: `${i * -0.4}s` }}
                  strokeDasharray="1 13"
                  strokeLinecap="round"
                  strokeWidth={3}
                />
              </g>
            );
          })}
        </svg>
      )}

      {RESOURCE_ORDER.map((type, i) => (
        <FlowNode
          key={type}
          className="text-label-sm md:text-body-md font-label font-semibold uppercase tracking-wide"
          color={RESOURCE_COLOR[type]}
          label={TYPE_LABEL[type]}
          pos={inputPositions[i]}
          truncate={isCompact}
        />
      ))}

      <FlowNode
        className="text-headline-md md:text-headline-lg-mobile font-bold tracking-tight text-accent"
        label={duckLabel}
        pos={DUCK_POS}
        truncate={false}
      />

      {OUTPUT_LABELS.map((label, i) => (
        <FlowNode
          key={label}
          className="text-label-sm md:text-body-md font-label font-semibold uppercase tracking-wide text-foreground"
          label={label}
          pos={outputPositions[i]}
          truncate={isCompact}
        />
      ))}
    </div>
  );
};

export default ProcessDiagram;
