"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Chip, CloseButton } from "@heroui/react";
import CoordinatesInput from "@/components/coordinates-input";
import { ReportLocationValue } from "@/lib/editor-actions";
import { ReportCurrentValues } from "@/components/report/types";

interface StepLocationProps {
  current: ReportCurrentValues;
  value?: ReportLocationValue[];
  onChange: (value: ReportLocationValue[] | undefined) => void;
}

interface Coordinates {
  lat?: string;
  lng?: string;
  radius_m?: number;
}

/** Files only: drop the places the record covers on the map. */
const StepLocation: React.FC<StepLocationProps> = ({ current, value, onChange }) => {
  const t = useTranslations("report-form");
  const [coords, setCoords] = useState<Coordinates>({});
  const [locations, setLocations] = useState<ReportLocationValue[]>(value ?? []);

  const emit = (next: ReportLocationValue[]) => {
    setLocations(next);
    onChange(next.length ? next : undefined);
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
    emit([...locations, location]);
    setCoords({});
  };

  const removeLocation = (index: number) => {
    emit(locations.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-2">
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
  );
};

export default StepLocation;
