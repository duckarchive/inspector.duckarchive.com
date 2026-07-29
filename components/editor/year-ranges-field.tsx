"use client";

import { useState } from "react";
import { Chip } from "@heroui/chip";
import { NumberInput } from "@heroui/number-input";
import { Button } from "@heroui/button";
import { sameYearRange, YearRange } from "@/lib/editor-actions";

interface YearRangesFieldProps {
  value: YearRange[];
  onChange: (next: YearRange[]) => void;
}

const YearRangesField: React.FC<YearRangesFieldProps> = ({ value, onChange }) => {
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
      <span className="text-sm text-default-600">Роки</span>
      <div className="flex flex-wrap gap-1">
        {value.length === 0 && <span className="text-default-400 text-sm">Немає</span>}
        {value.map((r) => (
          <Chip key={`${r.start_year}-${r.end_year}`} onClose={() => remove(r)} variant="flat">
            {r.start_year}–{r.end_year}
          </Chip>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <NumberInput
          size="sm"
          label="Від"
          hideStepper
          value={start}
          onValueChange={setStart}
          formatOptions={{ useGrouping: false }}
        />
        <NumberInput
          size="sm"
          label="До"
          hideStepper
          value={end}
          onValueChange={setEnd}
          formatOptions={{ useGrouping: false }}
        />
        <Button size="sm" onPress={add} isDisabled={start === undefined || end === undefined}>
          Додати
        </Button>
      </div>
    </div>
  );
};

export default YearRangesField;
