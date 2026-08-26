"use client";

import { useState } from "react";
import { Button, Chip, CloseButton, Input, TextField } from "@heroui/react";
import { sameYearRange, YearRange } from "@/lib/editor-actions";
import { FaPlus } from "react-icons/fa";

export interface YearRangesFieldLabels {
  legend: string;
  empty: string;
  from: string;
  to: string;
  removeAria: string;
}

const DEFAULT_LABELS: YearRangesFieldLabels = {
  legend: "Роки",
  empty: "Немає",
  from: "Від",
  to: "До",
  removeAria: "Видалити роки",
};

interface YearRangesFieldProps {
  value: YearRange[];
  onChange: (next: YearRange[]) => void;
  /** Editor call sites keep the uk defaults; the localized wizard passes its own. */
  labels?: YearRangesFieldLabels;
}

const parseYear = (raw: string): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const year = Number(trimmed);
  return Number.isInteger(year) ? year : undefined;
};

const YearRangesField: React.FC<YearRangesFieldProps> = ({ value, onChange, labels = DEFAULT_LABELS }) => {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const startYear = parseYear(start);
  const endYear = parseYear(end);
  const canAdd = startYear !== undefined && endYear !== undefined && startYear <= endYear;

  const add = () => {
    if (!canAdd) {
      return;
    }
    const range: YearRange = { start_year: startYear, end_year: endYear };
    if (value.some((r) => sameYearRange(r, range))) {
      return;
    }
    onChange([...value, range]);
    setStart("");
    setEnd("");
  };

  const remove = (range: YearRange) => {
    onChange(value.filter((r) => !sameYearRange(r, range)));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-muted">{labels.legend}</span>
      <div className="flex flex-wrap gap-1">
        {value.length === 0 && <span className="text-muted text-sm">{labels.empty}</span>}
        {value.map((r) => (
          <Chip key={`${r.start_year}-${r.end_year}`} variant="soft">
            {r.start_year}–{r.end_year}
            <CloseButton aria-label={labels.removeAria} onPress={() => remove(r)} />
          </Chip>
        ))}
      </div>
      <div className="flex items-center gap-2">
        {/* the same joined from–to pair the search filters use */}
        <div className="flex grow min-w-0">
          <TextField type="number" className="min-w-0 flex-1 relative focus-within:z-10" value={start} onChange={setStart}>
            <Input className="rounded-r-none" placeholder={labels.from} />
          </TextField>
          <TextField type="number" className="min-w-0 flex-1 relative -ml-px focus-within:z-10" value={end} onChange={setEnd}>
            <Input className="rounded-l-none" placeholder={labels.to} />
          </TextField>
        </div>
        <Button isIconOnly size="sm" onPress={add} isDisabled={!canAdd}>
          <FaPlus />
        </Button>
      </div>
    </div>
  );
};

export default YearRangesField;
