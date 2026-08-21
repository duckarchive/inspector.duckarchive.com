"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input, TextArea, TextField } from "@heroui/react";
import YearRangesField from "@/components/editor/year-ranges-field";
import { ReportNotePayload, sameYearRange, YearRange } from "@/lib/editor-actions";
import { ReportCurrentValues } from "@/components/report/types";

interface StepDataProps {
  current: ReportCurrentValues;
  value?: ReportNotePayload["data"];
  onChange: (value: ReportNotePayload["data"] | undefined) => void;
}

/** Title / info / years, diffed against what the page already shows. */
const StepData: React.FC<StepDataProps> = ({ current, value, onChange }) => {
  const t = useTranslations("report-form");
  const [title, setTitle] = useState(value?.title?.value ?? current.title ?? "");
  const [info, setInfo] = useState(value?.info?.value ?? current.info ?? "");
  const [years, setYears] = useState<YearRange[]>(() =>
    value?.years
      ? [
          ...current.years.filter((y) => !value.years?.remove.some((r) => sameYearRange(r, y))),
          ...value.years.add,
        ]
      : current.years,
  );

  const emit = (next: { title: string; info: string; years: YearRange[] }) => {
    const data: NonNullable<ReportNotePayload["data"]> = {};
    if (next.title.trim() !== (current.title ?? "")) {
      data.title = { old: current.title, value: next.title.trim() };
    }
    if (next.info.trim() !== (current.info ?? "")) {
      data.info = { old: current.info, value: next.info.trim() };
    }
    const add = next.years.filter((y) => !current.years.some((c) => sameYearRange(c, y)));
    const remove = current.years.filter((c) => !next.years.some((y) => sameYearRange(y, c)));
    if (add.length || remove.length) {
      data.years = { add, remove };
    }
    onChange(Object.keys(data).length ? data : undefined);
  };

  return (
    <div className="flex flex-col gap-3">
      <TextField
        value={title}
        onChange={(next) => {
          setTitle(next);
          emit({ title: next, info, years });
        }}
      >
        <Input placeholder={t("data-title-label")} maxLength={2000} />
      </TextField>
      <TextField
        value={info}
        onChange={(next) => {
          setInfo(next);
          emit({ title, info: next, years });
        }}
      >
        <TextArea placeholder={t("data-info-label")} rows={2} maxLength={2000} />
      </TextField>
      <YearRangesField
        value={years}
        onChange={(next) => {
          setYears(next);
          emit({ title, info, years: next });
        }}
        labels={{
          legend: t("data-years-label"),
          empty: t("data-years-empty"),
          from: t("data-years-from"),
          to: t("data-years-to"),
          removeAria: t("data-years-remove"),
        }}
      />
      {!value && <p className="text-xs text-muted">{t("data-no-changes-hint")}</p>}
    </div>
  );
};

export default StepData;
