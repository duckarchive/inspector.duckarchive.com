"use client";

import { Tooltip } from "@heroui/react";
import { OnlineCopyCounts } from "@/data/resources";

interface OnlineCopiesMeterProps {
  counts: OnlineCopyCounts;
}

/** Left-to-right = most to least accessible, matching the file-table lock-icon convention. */
const SEGMENTS: { key: keyof OnlineCopyCounts; label: string; dotClassName: string; barClassName: string }[] = [
  { key: "public", label: "Публічно", dotClassName: "bg-success", barClassName: "bg-success" },
  { key: "restricted", label: "Обмежено", dotClassName: "bg-[#aaa]", barClassName: "bg-[#aaa]" },
  { key: "paywall", label: "Платно", dotClassName: "bg-[#ffdd00]", barClassName: "bg-[#ffdd00]" },
  { key: "unknown", label: "Невідомо", dotClassName: "bg-[#a78bfa]", barClassName: "bg-[#a78bfa]" },
];

const numberFormat = new Intl.NumberFormat("uk-UA");

const OnlineCopiesMeter: React.FC<OnlineCopiesMeterProps> = ({ counts }) => {
  const total = counts.public + counts.restricted + counts.paywall + counts.unknown;
  const visibleSegments = SEGMENTS.filter(({ key }) => counts[key] > 0);

  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="flex w-full max-w-32 flex-col gap-1 cursor-help">
        <span className="text-sm tabular-nums">{numberFormat.format(total)}</span>
        <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-surface-tertiary">
          {visibleSegments.map(({ key, barClassName }, i) => (
            <div
              key={key}
              className={barClassName}
              style={{
                width: `${(counts[key] / total) * 100}%`,
                borderRight: i < visibleSegments.length - 1 ? "2px solid var(--surface-tertiary)" : undefined,
              }}
            />
          ))}
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement="top">
        <Tooltip.Arrow />
        <div className="flex flex-col gap-1">
          {SEGMENTS.map(({ key, label, dotClassName }) => (
            <div key={key} className="flex items-center gap-1.5 text-sm">
              <span className={`inline-block size-2 rounded-full ${dotClassName}`} />
              <span>
                {label}: {numberFormat.format(counts[key])}
              </span>
            </div>
          ))}
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
};

export default OnlineCopiesMeter;
