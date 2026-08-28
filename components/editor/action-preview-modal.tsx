"use client";

import "leaflet/dist/leaflet.css";
import "../../node_modules/@duckarchive/map/dist/style.css";

import { Button, Modal, Spinner } from "@heroui/react";
import dynamic from "next/dynamic";
import type { GeoDuckMapProps } from "@duckarchive/map";
import { useActionPreview } from "@/hooks/useEditor";
import { ACTION_TYPE_LABELS, EditorQueue } from "@/lib/editor-actions";
import { ActionPreviewField, PreviewMarker } from "@/app/api/editor/actions/[entity]/[id]/preview/data";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

interface ActionPreviewModalProps {
  entity: EditorQueue;
  /** Action to preview; null keeps the modal closed. */
  actionId: string | null;
  onClose: () => void;
}

type ItemStatus = "same" | "added" | "removed";

const ITEM_CLASS: Record<ItemStatus, string> = {
  same: "",
  added: "bg-success-soft text-success-soft-foreground rounded-sm px-1 w-fit",
  removed: "bg-danger-soft text-danger-soft-foreground line-through rounded-sm px-1 w-fit",
};

const DiffColumn: React.FC<{ items: { text: string; status: ItemStatus }[] }> = ({ items }) => (
  <div className="flex flex-col gap-0.5 min-w-0">
    {items.length === 0 && <span className="text-muted">—</span>}
    {items.map((item, i) => (
      <span key={i} className={`break-words ${ITEM_CLASS[item.status]}`}>
        {item.text}
      </span>
    ))}
  </div>
);

const toPositions = (markers: PreviewMarker[]): GeoDuckMapProps["positions"] =>
  markers.map((m) => [m.lat, m.lng, m.radius_m ?? 0, m.title ?? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`]);

/** Both sides share one viewport (center over the union of markers, zoom from
 * their spread) so the eye can compare positions between the two maps. Without
 * onPositionChange GeoDuckMap renders static: no dragging, no zoom controls. */
const DiffMapPair: React.FC<{ before: PreviewMarker[]; after: PreviewMarker[] }> = ({ before, after }) => {
  const all = [...before, ...after];
  if (all.length === 0) return null;
  const center: [number, number] = [
    all.reduce((sum, m) => sum + m.lat, 0) / all.length,
    all.reduce((sum, m) => sum + m.lng, 0) / all.length,
  ];
  const spread = Math.max(
    ...all.map((m) => Math.max(Math.abs(m.lat - center[0]), Math.abs(m.lng - center[1]))),
  );
  const zoom = spread > 1 ? 5 : spread > 0.2 ? 7 : spread > 0.05 ? 9 : spread > 0.01 ? 11 : 13;
  const hideLayers = { searchInput: true, historicalLayers: true, yearInput: true };
  return (
    <div className="grid grid-cols-2 gap-3">
      {([before, after] as const).map((markers, side) => (
        <div key={side} className="h-48">
          <GeoDuckMap
            key={`preview-map-${side}-${markers.map((m) => `${m.lat},${m.lng}`).join(";")}`}
            className="rounded-lg text-accent"
            positions={toPositions(markers)}
            center={center}
            zoom={zoom}
            hideLayers={hideLayers}
          />
        </div>
      ))}
    </div>
  );
};

/** One attribute: items only on the after side are highlighted as added, items
 * only on the before side as removed; a changed scalar is both at once. */
const DiffField: React.FC<{ field: ActionPreviewField }> = ({ field }) => {
  const before = field.before.map((text) => ({
    text,
    status: (field.after.includes(text) ? "same" : "removed") as ItemStatus,
  }));
  const after = field.after.map((text) => ({
    text,
    status: (field.before.includes(text) ? "same" : "added") as ItemStatus,
  }));
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted">{field.label}</span>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <DiffColumn items={before} />
        <DiffColumn items={after} />
      </div>
      {(field.beforeMarkers || field.afterMarkers) && (
        <DiffMapPair before={field.beforeMarkers ?? []} after={field.afterMarkers ?? []} />
      )}
    </div>
  );
};

const ActionPreviewModal: React.FC<ActionPreviewModalProps> = ({ entity, actionId, onClose }) => {
  const { data, isLoading } = useActionPreview(entity, actionId);
  const preview = data && "fields" in data ? data : null;
  const errorMessage = data && "message" in data ? data.message : null;

  return (
    <Modal isOpen={Boolean(actionId)} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {preview ? ACTION_TYPE_LABELS[preview.type] : "Попередній перегляд"}
                {preview?.target && <span className="text-muted font-normal"> · {preview.target}</span>}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
              {isLoading || !data ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Розрахунок змін…</span>
                </div>
              ) : errorMessage ? (
                <p className="text-sm text-danger">{errorMessage}</p>
              ) : preview ? (
                <>
                  {preview.fields.length > 0 && (
                    <div className="grid grid-cols-2 gap-3 text-xs text-muted font-medium border-b border-default pb-1">
                      <span>До</span>
                      <span>Після</span>
                    </div>
                  )}
                  {preview.fields.map((field) => (
                    <DiffField key={field.label} field={field} />
                  ))}
                  {preview.summary && <p className="text-sm text-muted">{preview.summary}</p>}
                  {preview.text && <p className="text-sm text-muted italic">{preview.text}</p>}
                </>
              ) : null}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Закрити
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default ActionPreviewModal;
