"use client";

import { useState } from "react";
import { Button, Chip, CloseButton, NumberField } from "@heroui/react";
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

const YearRangesField: React.FC<YearRangesFieldProps> = ({ value, onChange, labels = DEFAULT_LABELS }) => {
  const [start, setStart] = useState<number | undefined>();
  const [end, setEnd] = useState<number | undefined>();

  const add = () => {
    if (start === undefined || end === undefined || start > end) {
      return;
    }
    const range: YearRange = { start_year: start, end_year: end };
    if (value.some((r) => sameYearRange(r, range))) {
      return;
    }
    onChange([...value, range]);
    setStart(undefined);
    setEnd(undefined);
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
      <div className="flex items-end gap-2">
        <NumberField className="grow" value={start} onChange={setStart} formatOptions={{ useGrouping: false }}>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input placeholder={labels.from} />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
        <NumberField className="grow" value={end} onChange={setEnd} formatOptions={{ useGrouping: false }}>
          <NumberField.Group>
            <NumberField.DecrementButton />
            <NumberField.Input placeholder={labels.to} />
            <NumberField.IncrementButton />
          </NumberField.Group>
        </NumberField>
        <Button isIconOnly size="sm" onPress={add} isDisabled={start === undefined || end === undefined}>
          <FaPlus />
        </Button>
      </div>
    </div>
  );
};

export default YearRangesField;
