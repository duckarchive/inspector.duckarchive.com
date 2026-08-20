"use client";

import { Key, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip, CloseButton, Input, Separator, TextField } from "@heroui/react";
import Select from "@/components/select";
import CoordinatesInput from "@/components/coordinates-input";
import { useAuthors } from "@/hooks/useAuthors";
import { ReportCatalogRef, ReportLocationValue, ReportNotePayload } from "@/lib/editor-actions";
import { ReportCurrentValues } from "@/components/report/types";

interface StepGeoProps {
  current: ReportCurrentValues;
  value?: ReportNotePayload["geo"];
  onChange: (value: ReportNotePayload["geo"] | undefined) => void;
}

interface Coordinates {
  lat?: string;
  lng?: string;
  radius_m?: number;
}

/** Files only: link authors (public author search) and drop locations on the map. */
const StepGeo: React.FC<StepGeoProps> = ({ current, value, onChange }) => {
  const t = useTranslations("report-form");
  const [query, setQuery] = useState("");
  const [newAuthor, setNewAuthor] = useState("");
  const [coords, setCoords] = useState<Coordinates>({});
  const [authors, setAuthors] = useState<ReportCatalogRef[]>(value?.authors ?? []);
  const [locations, setLocations] = useState<ReportLocationValue[]>(value?.locations ?? []);

  const { data: found } = useAuthors(query || undefined);
  const linkedIds = new Set(current.authors?.map((a) => a.id));

  const emit = (next: { authors: ReportCatalogRef[]; locations: ReportLocationValue[] }) => {
    const geo: NonNullable<ReportNotePayload["geo"]> = {};
    if (next.authors.length) geo.authors = next.authors;
    if (next.locations.length) geo.locations = next.locations;
    onChange(Object.keys(geo).length ? geo : undefined);
  };

  const addAuthor = (key: Key | null) => {
    const id = String(key ?? "");
    const match = found?.find((a) => a.id === id);
    if (!match || authors.some((a) => a.id === id)) {
      return;
    }
    const next = [...authors, { id: match.id, title: match.title }];
    setAuthors(next);
    emit({ authors: next, locations });
  };

  const addNewAuthor = () => {
    const title = newAuthor.trim();
    if (!title || authors.some((a) => a.title === title)) {
      return;
    }
    const next = [...authors, { title }];
    setAuthors(next);
    setNewAuthor("");
    emit({ authors: next, locations });
  };

  const removeAuthor = (index: number) => {
    const next = authors.filter((_, i) => i !== index);
    setAuthors(next);
    emit({ authors: next, locations });
  };

  const addLocation = () => {
    const lat = Number(coords.lat);
    const lng = Number(coords.lng);
    if (!coords.lat || !coords.lng || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    const location = { lat, lng, radius_m: coords.radius_m ?? 0 };
    if (locations.some((l) => l.lat === lat && l.lng === lng && l.radius_m === location.radius_m)) {
      return;
    }
    const next = [...locations, location];
    setLocations(next);
    setCoords({});
    emit({ authors, locations: next });
  };

  const removeLocation = (index: number) => {
    const next = locations.filter((_, i) => i !== index);
    setLocations(next);
    emit({ authors, locations: next });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">{t("geo-authors-legend")}</span>
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

      <Separator className="my-1" />

      <div className="flex flex-col gap-2">
        <span className="text-sm text-muted">{t("geo-locations-legend")}</span>
        <div className="flex flex-wrap gap-1">
          {locations.length === 0 && <span className="text-muted text-sm">{t("geo-locations-empty")}</span>}
          {locations.map((location, index) => (
            <Chip key={`${location.lat},${location.lng},${location.radius_m}`} variant="soft">
              {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              {location.radius_m ? ` ±${location.radius_m}` : ""}
              <CloseButton aria-label={t("geo-locations-remove")} onPress={() => removeLocation(index)} />
            </Chip>
          ))}
        </div>
        <CoordinatesInput value={coords} onChange={setCoords} year={String(current.years[0]?.start_year ?? "")} />
        <Button size="sm" onPress={addLocation} isDisabled={!coords.lat || !coords.lng}>
          {t("geo-locations-add")}
        </Button>
      </div>
    </div>
  );
};

export default StepGeo;
