// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import { Modal, ModalContent, useDisclosure } from "@heroui/modal";
import { Accordion, AccordionItem } from "@heroui/accordion";
import { NumberInput } from "@heroui/number-input";
import dynamic from "next/dynamic";
import { IoChevronDown } from "react-icons/io5";
import { useEffect, useState } from "react";
import { Input } from "@heroui/input";
import { parseMapLinkUrl } from "@/lib/map";
import { MarkerValue } from "@duckarchive/map/dist/LocationMarker";

const UKRAINE_CENTER: [number, number] = [49.0139, 31.2858];

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

interface Coordinates {
  lat?: string;
  lng?: string;
  radius_m?: number;
}

interface CoordinatesInputProps {
  isLoading?: boolean;
  value: Coordinates;
  year?: string;
  onChange: (value: Coordinates) => void;
}

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({ value, onChange, year, isLoading }) => {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [coordinates, setCoordinates] = useState<Coordinates>(value);
  const [debouncedCoordinates, setDebouncedCoordinates] = useState<Coordinates | undefined>();
  const [formErrors, setFormErrors] = useState<Coordinates>({});

  // Debounce coordinate changes to avoid excessive updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCoordinates(coordinates);
    }, 300);

    return () => clearTimeout(timer);
  }, [coordinates]);

  // When the modal is closed, propagate the debounced coordinates to the parent
  useEffect(() => {
    if (!isOpen && debouncedCoordinates) {
      onChange(debouncedCoordinates);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, debouncedCoordinates]);

  const handleGeoChange = (position: MarkerValue) => {
    setCoordinates({
      ...coordinates,
      lat: position[0].toString(),
      lng: position[1].toString(),
      radius_m: position[2] || 0,
    });
  };

  const handleLatChange = (lat: string) => {
    const latNum = parseFloat(lat);
    if (lat && isNaN(latNum)) {
      setFormErrors({ ...formErrors, lat: "Широта має бути числом" });
    } else {
      delete formErrors.lat;
      setFormErrors(formErrors);
      setCoordinates({ ...coordinates, lat });
    }
  };

  const handleLngChange = (lng: string) => {
    const lngNum = parseFloat(lng);
    if (lng && isNaN(lngNum)) {
      setFormErrors({ ...formErrors, lng: "Довгота має бути числом" });
    } else {
      delete formErrors.lng;
      setFormErrors(formErrors);
      setCoordinates({ ...coordinates, lng });
    }
  };

  const handleRadiusChange = (radius: number) => {
    setCoordinates({ ...coordinates, radius_m: radius });
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text/plain");
    const parsed = parseMapLinkUrl(raw);
    if (parsed) {
      e.preventDefault();
      setCoordinates((prev) => ({ ...prev, lat: parsed.lat.toString(), lng: parsed.lng.toString() }));
    }
  };

  const latLng: MarkerValue = [
    +(coordinates.lat || UKRAINE_CENTER[0]),
    +(coordinates.lng || UKRAINE_CENTER[1]),
    coordinates.radius_m || 0,
  ];
  const center = latLng.slice(0, 2) as [number, number];
  const title =
    coordinates.lat && coordinates.lng
      ? `${coordinates.lat},${coordinates.lng}${coordinates.radius_m ? ` ±${coordinates.radius_m}м` : ""}`
      : "Ввести координати вручну";
  return (
    <div className="h-64 flex flex-col gap-0">
      <div className="h-full" onClick={onOpen}>
        {!isOpen && (
          <GeoDuckMap
            key="static-geoduck-map"
            className="rounded-lg text-primary z-0"
            positions={[latLng]}
            center={center}
            year={+(year || 0) || undefined}
            hideLayers={{ searchInput: true, historicalLayers: true }}
            zoom={12}
          />
        )}
      </div>
      <Accordion isCompact className="p-0" variant="light">
        <AccordionItem
          key="map-help"
          className="flex flex-col"
          classNames={{
            trigger: `p-0 gap-1 w-auto`,
            content: "p-0 flex flex-col gap-2",
            title: "text-xs opacity-50",
            indicator: "inline-flex leading-none",
          }}
          disableIndicatorAnimation
          indicator={({ isOpen }) => (
            <IoChevronDown size={16} className={`${isOpen ? "rotate-180" : ""} transition-transform inline`} />
          )}
          title={title}
        >
          <fieldset aria-label="Ручне введення координат" className="flex flex-col gap-2">
            <Input
              size="sm"
              isDisabled={isLoading}
              isInvalid={!!formErrors.lat}
              errorMessage={formErrors.lat}
              label="Широта (lat)"
              isClearable
              value={coordinates.lat}
              onValueChange={handleLatChange}
              onClear={() => setCoordinates({ ...coordinates, lat: undefined })}
              onPaste={handlePaste}
              pattern="^-?\d+(\.\d+)?$"
            />
            <Input
              size="sm"
              isDisabled={isLoading}
              isInvalid={!!formErrors.lng}
              errorMessage={formErrors.lng}
              label="Довгота (lng)"
              isClearable
              value={coordinates.lng}
              onValueChange={handleLngChange}
              onClear={() => setCoordinates({ ...coordinates, lng: undefined })}
              onPaste={handlePaste}
              pattern="^-?\d+(\.\d+)?$"
            />
            <NumberInput
              hideStepper
              size="sm"
              className="basis-1/4 shrink-0"
              isDisabled={isLoading}
              isInvalid={!!formErrors.radius_m}
              errorMessage={formErrors.radius_m}
              label="Радіус"
              isClearable
              formatOptions={{
                style: "unit",
                unit: "meter",
                unitDisplay: "short",
              }}
              maxValue={10000}
              value={coordinates.radius_m || 0}
              onValueChange={handleRadiusChange}
              onClear={() => setCoordinates({ ...coordinates, radius_m: undefined })}
              onPaste={handlePaste}
            />
          </fieldset>
        </AccordionItem>
      </Accordion>

      <Modal isOpen={isOpen} size="5xl" onClose={onClose} title="Виберіть місце на карті">
        <ModalContent className="h-[80vh] md:h-[90vh]">
          <GeoDuckMap
            key="geoduck-map"
            className="rounded-lg text-primary"
            positions={[latLng]}
            onPositionChange={handleGeoChange}
            year={+(year || 0) || undefined}
            center={center}
            zoom={12}
          />
        </ModalContent>
      </Modal>
    </div>
  );
};

export default CoordinatesInput;
