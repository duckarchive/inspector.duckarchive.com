"use client";

import { Key, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, TextField } from "@heroui/react";
import Select from "@/components/select";
import { ReportNotePayload } from "@/lib/editor-actions";
import { ReportCurrentValues } from "@/components/report/types";

interface StepOnlineCopyProps {
  current: ReportCurrentValues;
  value?: ReportNotePayload["online_copy"];
  onChange: (value: ReportNotePayload["online_copy"] | undefined) => void;
}

/**
 * Points at a bad link. The record's own copies are already loaded, and there is
 * no public endpoint that searches online copies, so the select filters those
 * client-side; anything else goes in the URL field.
 */
const StepOnlineCopy: React.FC<StepOnlineCopyProps> = ({ current, value, onChange }) => {
  const t = useTranslations("report-form");
  const copies = current.onlineCopies ?? [];
  const [copyId, setCopyId] = useState(value?.id ?? "");
  const [url, setUrl] = useState(value?.url ?? "");

  const emit = (next: { copyId: string; url: string }) => {
    const trimmed = next.url.trim();
    if (!next.copyId && !trimmed) {
      onChange(undefined);
      return;
    }
    onChange({
      ...(next.copyId ? { id: next.copyId, url: copies.find((c) => c.id === next.copyId)?.url } : {}),
      ...(trimmed ? { url: trimmed } : {}),
    });
  };

  const selectCopy = (key: Key | null) => {
    const id = String(key ?? "");
    setCopyId(id);
    emit({ copyId: id, url });
  };

  const changeUrl = (next: string) => {
    setUrl(next);
    emit({ copyId, url: next });
  };

  return (
    <div className="flex flex-col gap-3">
      {copies.length > 0 && (
        <Select
          label={t("copy-select-label")}
          virtualized
          wrapUrls
          items={copies}
          getKey={(c) => c.id}
          getTextValue={(c) => c.url}
          renderItem={(c) => c.url}
          value={copyId}
          onChange={selectCopy}
        />
      )}
      <TextField value={url} onChange={changeUrl}>
        <Input placeholder={t("copy-url-label")} maxLength={2000} />
      </TextField>
      <p className="text-xs text-muted">{t("copy-url-hint")}</p>
    </div>
  );
};

export default StepOnlineCopy;
