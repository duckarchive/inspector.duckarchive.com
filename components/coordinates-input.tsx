// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import {
  Accordion,
  Button,
  CloseButton,
  FieldError,
  InputGroup,
  Modal,
  NumberField,
  TextField,
  useOverlayState,
} from "@heroui/react";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { parseMapLinkUrl } from "@/lib/map";
import type { GeoDuckMapProps } from "@duckarchive/map";

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
  isDisabled?: boolean;
  value: Coordinates;
  year?: string;
  onChange: (value: Coordinates) => void;
}

const CoordinatesInput: React.FC<CoordinatesInputProps> = ({ value, onChange, year, isLoading, isDisabled }) => {
  const state = useOverlayState();
  const isOpen = state.isOpen;
  const [coordinates, setCoordinates] = useState<Coordinates>(value);
  const [debouncedCoordinates, setDebouncedCoordinates] = useState<Coordinates | undefined>();
  const [formErrors, setFormErrors] = useState<Coordinates>({});

  // sync when the parent delivers coordinates after mount (edit modals populate
  // their state in an effect); content comparison prevents an onChange loop
  useEffect(() => {
    setCoordinates((prev) =>
      prev.lat === value.lat && prev.lng === value.lng && prev.radius_m === value.radius_m ? prev : value,
    );
  }, [value]);

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

  const handleGeoChange = (position: GeoDuckMapProps["positions"][number]) => {
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

  // Closing already propagates the picked point (see the effect above), but that path
  // waits on the 300 ms debounce; flushing here means the value the user just clicked is
  // in the parent the moment the modal closes, with no dependence on timing.
  const handleComplete = () => {
    onChange(coordinates);
    state.close();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text/plain");
    const parsed = parseMapLinkUrl(raw);
    if (parsed) {
      e.preventDefault();
      setCoordinates((prev) => ({ ...prev, lat: parsed.lat.toString(), lng: parsed.lng.toString() }));
    }
  };

  const hasPoint = Boolean(coordinates.lat && coordinates.lng);
  const latLng: GeoDuckMapProps["positions"][number] = [
    +(coordinates.lat || UKRAINE_CENTER[0]),
    +(coordinates.lng || UKRAINE_CENTER[1]),
    coordinates.radius_m || 5000,
  ];
  const center = latLng.slice(0, 2) as [number, number];
  const title =
    coordinates.lat && coordinates.lng
      ? `${coordinates.lat},${coordinates.lng}${coordinates.radius_m ? ` ±${coordinates.radius_m}м` : ""}`
      : "Ввести координати вручну";
  return (
    <div className={`h-64 flex flex-col gap-0 ${isDisabled ? "cursor-not-allowed" : ""}`}>
      <div className={`h-full ${isDisabled ? "pointer-events-none opacity-50" : ""}`} onClick={state.open}>
        {!isOpen && (
          <GeoDuckMap
            key={`static-geoduck-map-${center.join(",")}`}
            className="rounded-lg text-accent"
            positions={hasPoint ? [latLng] : []}
            center={center}
            year={+(year || 0) || undefined}
            hideLayers={{ searchInput: true, historicalLayers: true }}
            zoom={5}
          />
        )}
      </div>
      <Accordion className="p-0" isDisabled={isDisabled}>
        <Accordion.Item id="map-help" className="flex flex-col" isDisabled={isDisabled}>
          <Accordion.Heading>
            <Accordion.Trigger className="p-0 gap-1 w-auto text-xs opacity-50">
              {title}
              <Accordion.Indicator className="inline-flex leading-none" />
            </Accordion.Trigger>
          </Accordion.Heading>
          <Accordion.Panel>
            <Accordion.Body className="p-1 flex flex-col gap-2">
              <fieldset aria-label="Ручне введення координат" className="flex flex-col gap-2">
                <TextField
                  isDisabled={isLoading}
                  isInvalid={!!formErrors.lat}
                  value={coordinates.lat ?? ""}
                  onChange={handleLatChange}
                >
                  <InputGroup>
                    <InputGroup.Input onPaste={handlePaste} pattern="^-?\d+(\.\d+)?$" placeholder="Широта (lat)" />
                    {coordinates.lat ? (
                      <InputGroup.Suffix>
                        <CloseButton
                          aria-label="Очистити широту"
                          onPress={() => setCoordinates({ ...coordinates, lat: undefined })}
                        />
                      </InputGroup.Suffix>
                    ) : null}
                  </InputGroup>
                  <FieldError>{formErrors.lat}</FieldError>
                </TextField>
                <TextField
                  isDisabled={isLoading}
                  isInvalid={!!formErrors.lng}
                  value={coordinates.lng ?? ""}
                  onChange={handleLngChange}
                >
                  <InputGroup>
                    <InputGroup.Input onPaste={handlePaste} pattern="^-?\d+(\.\d+)?$" placeholder="Довгота (lng)" />
                    {coordinates.lng ? (
                      <InputGroup.Suffix>
                        <CloseButton
                          aria-label="Очистити довготу"
                          onPress={() => setCoordinates({ ...coordinates, lng: undefined })}
                        />
                      </InputGroup.Suffix>
                    ) : null}
                  </InputGroup>
                  <FieldError>{formErrors.lng}</FieldError>
                </TextField>
                <NumberField
                  className="basis-1/4 shrink-0"
                  isDisabled={isLoading}
                  isInvalid={!!formErrors.radius_m}
                  formatOptions={{
                    style: "unit",
                    unit: "meter",
                    unitDisplay: "short",
                  }}
                  maxValue={10000}
                  value={coordinates.radius_m || 0}
                  onChange={handleRadiusChange}
                >
                  <NumberField.Group>
                    <NumberField.DecrementButton />
                    <NumberField.Input onPaste={handlePaste} placeholder="Радіус" />
                    <NumberField.IncrementButton />
                  </NumberField.Group>
                  <FieldError>{formErrors.radius_m}</FieldError>
                </NumberField>
              </fieldset>
            </Accordion.Body>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>

      <Modal isOpen={isOpen} onOpenChange={state.setOpen}>
        <Modal.Backdrop>
          <Modal.Container size="cover">
            <Modal.Dialog aria-label="Виберіть місце на карті" className="h-[80vh] md:h-[90vh]">
              {/* `relative` anchors the overlay button; the map still fills the dialog. */}
              <div className="relative h-full">
                <GeoDuckMap
                  key="geoduck-map"
                  className="rounded-lg text-accent"
                  positions={[latLng]}
                  onPositionChange={handleGeoChange}
                  year={+(year || 0) || undefined}
                  center={center}
                  zoom={12}
                />
                {/* Bottom-centre is the one free spot: the map puts its search top-left,
                    the year top-right, the hovered-region tooltip bottom-left and
                    Leaflet's attribution bottom-right. The z-index clears Leaflet's
                    control panes (1000) and the map's own loading spinner (1001). */}
                <Button
                  className="absolute bottom-4 left-1/2 z-[1002] -translate-x-1/2 shadow-lg"
                  size="lg"
                  onPress={handleComplete}
                >
                  Готово
                </Button>
              </div>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
};

export default CoordinatesInput;
