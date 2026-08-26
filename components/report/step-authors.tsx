"use client";

import { Key, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip, CloseButton, Input, TextField } from "@heroui/react";
import Select from "@/components/select";
import { useAuthors } from "@/hooks/useAuthors";
import { ReportCatalogRef } from "@/lib/editor-actions";
import { ReportCurrentValues } from "@/components/report/types";

interface StepAuthorsProps {
  current: ReportCurrentValues;
  value?: ReportCatalogRef[];
  onChange: (value: ReportCatalogRef[] | undefined) => void;
}

/** Files only: link existing authors (public author search) or propose new ones. */
const StepAuthors: React.FC<StepAuthorsProps> = ({ current, value, onChange }) => {
  const t = useTranslations("report-form");
  const [query, setQuery] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [authors, setAuthors] = useState<ReportCatalogRef[]>(value ?? []);

  const { data: found } = useAuthors(query || undefined);
  const linkedIds = new Set(current.authors?.map((a) => a.id));

  const emit = (next: ReportCatalogRef[]) => {
    setAuthors(next);
    onChange(next.length ? next : undefined);
  };

  const addAuthor = (key: Key | null) => {
    const id = String(key ?? "");
    const match = found?.find((a) => a.id === id);
    if (!match || authors.some((a) => a.id === id)) {
      return;
    }
    emit([...authors, { id: match.id, title: match.title }]);
  };

  const addNewAuthor = () => {
    const title = newAuthor.trim();
    if (!title || authors.some((a) => a.title === title)) {
      return;
    }
    emit([...authors, { title }]);
    setNewAuthor("");
  };

  const removeAuthor = (index: number) => {
    emit(authors.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {authors.length === 0 && <span className="text-muted text-sm">{t("geo-authors-empty")}</span>}
        {authors.map((author, index) => (
          <Chip key={author.id ?? author.title} color="success" variant={author.id ? "soft" : "secondary"}>
            {author.title}
            <CloseButton aria-label={t("geo-authors-remove")} onPress={() => removeAuthor(index)} />
          </Chip>
        ))}
      </div>
      <Select
        label={t("geo-authors-search-label")}
        virtualized
        items={(found ?? []).filter((a) => !linkedIds.has(a.id))}
        getKey={(a) => a.id}
        getTextValue={(a) => a.title}
        renderItem={(a) => a.title}
        inputValue={query}
        onInputChange={setQuery}
        onChange={addAuthor}
      />
      <div className="flex items-end gap-2">
        <TextField className="grow" value={newAuthor} onChange={setNewAuthor}>
          <Input placeholder={t("geo-authors-new-label")} maxLength={500} />
        </TextField>
        <Button size="sm" onPress={addNewAuthor} isDisabled={!newAuthor.trim()}>
          {t("geo-authors-add")}
        </Button>
      </div>
    </div>
  );
};

export default StepAuthors;
