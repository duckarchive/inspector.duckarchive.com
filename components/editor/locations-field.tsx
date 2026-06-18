"use client";

import { useState } from "react";
import { Chip } from "@heroui/chip";
import { Button } from "@heroui/button";
import CoordinatesInput from "@/components/coordinates-input";

export interface LocationValue {
  lat: number;
  lng: number;
  radius_m: number;
}

export interface LocationOps {
  /** location ids to remove */
  remove: string[];
  /** new locations to add */
  add: LocationValue[];
}

export const emptyLocationOps = (): LocationOps => ({ remove: [], add: [] });

interface ExistingLocation {
  id: string;
  lat: number;
  lng: number;
  radius_m: number;
}

interface LocationsFieldProps {
  locations: ExistingLocation[];
  ops: LocationOps;
  onChange: (ops: LocationOps) => void;
}

const fmt = (l: { lat: number; lng: number }) => `${l.lat.toFixed(4)}, ${l.lng.toFixed(4)}`;

const LocationsField: React.FC<LocationsFieldProps> = ({ locations, ops, onChange }) => {
  const [draft, setDraft] = useState<{ lat?: string; lng?: string; radius_m?: number }>({});

  const addDraft = () => {
    const lat = Number(draft.lat);
    const lng = Number(draft.lng);
    if (!draft.lat || !draft.lng || Number.isNaN(lat) || Number.isNaN(lng)) {
      return;
    }
    onChange({ ...ops, add: [...ops.add, { lat, lng, radius_m: draft.radius_m ?? 0 }] });
    setDraft({});
  };

  const toggleRemove = (id: string) =>
    onChange({ ...ops, remove: ops.remove.includes(id) ? ops.remove.filter((x) => x !== id) : [...ops.remove, id] });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm text-default-600">Локації</span>
      <div className="flex flex-wrap gap-1">
        {locations.length === 0 && ops.add.length === 0 && <span className="text-default-400 text-sm">Немає</span>}
        {locations.map((l) => (
          <Chip
            key={l.id}
            variant={ops.remove.includes(l.id) ? "solid" : "flat"}
            color={ops.remove.includes(l.id) ? "danger" : "default"}
            onClose={() => toggleRemove(l.id)}
          >
            {fmt(l)}
          </Chip>
        ))}
        {ops.add.map((l, i) => (
          <Chip key={`${l.lat}-${l.lng}-${i}`} color="success" onClose={() => onChange({ ...ops, add: ops.add.filter((_, idx) => idx !== i) })}>
            + {fmt(l)}
          </Chip>
        ))}
      </div>
      <CoordinatesInput value={draft} onChange={setDraft} />
      <Button size="sm" onPress={addDraft} isDisabled={!draft.lat || !draft.lng}>
        Додати локацію
      </Button>
    </div>
  );
};

export default LocationsField;
