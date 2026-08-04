"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, Separator, TextArea, TextField, toast } from "@heroui/react";
import YearRangesField from "@/components/editor/year-ranges-field";
import OnlineCopiesField, { emptyOnlineCopyOps, OnlineCopyOps } from "@/components/editor/online-copies-field";
import CatalogSelect from "@/components/editor/catalog-select";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";
import { useCatalogPicker } from "@/hooks/useCatalogPicker";
import { editorInventoriesEndpoint } from "@/hooks/useEditor";

interface InventoryEditModalProps {
  inventory: EditorInventory | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const InventoryEditModal: React.FC<InventoryEditModalProps> = ({ inventory, isOpen, onClose, onSubmitted }) => {
  const { submit: submitInventoryAction, submitMany: submitInventoryActions, isMutating } = useSubmitAction("inventory");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [years, setYears] = useState<YearRange[]>([]);
  const [copyOps, setCopyOps] = useState<OnlineCopyOps>(emptyOnlineCopyOps());

  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const mergePicker = useCatalogPicker<EditorInventory>(
    editorInventoriesEndpoint(inventory?.fond_id),
    mergeTargetId,
    inventory?.id,
  );

  useEffect(() => {
    if (inventory) {
      setCode(inventory.code);
      setTitle(inventory.title ?? "");
      setInfo(inventory.info ?? "");
      setYears(inventory.years.map((y) => ({ start_year: y.start_year, end_year: y.end_year })));
      setCopyOps(emptyOnlineCopyOps());
      setMergeTargetId("");
    }
  }, [inventory]);

  if (!inventory) {
    return null;
  }

  const handleSubmit = async () => {
    const id = inventory.id;
    const bodies: SubmitActionBody[] = [];

    if (code !== inventory.code) {
      bodies.push({ type: "change_code", target_id: id, note: encodeNote({ v: 1, field: "code", value: code }) });
    }
    if (title !== (inventory.title ?? "")) {
      bodies.push({ type: "change_title", target_id: id, note: encodeNote({ v: 1, field: "title", value: title }) });
    }
    if (info !== (inventory.info ?? "")) {
      bodies.push({ type: "change_info", target_id: id, note: encodeNote({ v: 1, field: "info", value: info }) });
    }
    for (const removed of inventory.years.filter((o) => !years.some((y) => sameYearRange(y, o)))) {
      bodies.push({ type: "remove_year_range", target_id: id, note: encodeNote({ v: 1, field: "year_range", value: removed }) });
    }
    for (const added of years.filter((y) => !inventory.years.some((o) => sameYearRange(o, y)))) {
      bodies.push({ type: "add_year_range", target_id: id, note: encodeNote({ v: 1, field: "year_range", value: added }) });
    }
    for (const copyId of copyOps.connect) {
      bodies.push({ type: "connect_to_online_copy", target_id: id, online_copy_id: copyId });
    }
    for (const copyId of copyOps.disconnect) {
      bodies.push({ type: "disconnect_from_online_copy", target_id: id, online_copy_id: copyId });
    }

    if (bodies.length === 0) {
      toast("Немає змін");
      return;
    }

    await submitInventoryActions(bodies);
    onSubmitted?.();
    onClose();
  };

  const handleMerge = async () => {
    if (!mergeTargetId || mergeTargetId === inventory.id) {
      return;
    }
    await submitInventoryAction({ type: "merge_to", target_id: inventory.id, note: encodeNote({ v: 1, field: "parent", value: mergeTargetId }) });
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="flex flex-col gap-0.5">
              <Modal.Heading>Редагувати опис {inventory.code}</Modal.Heading>
              <span className="text-xs font-normal text-muted select-all">{inventory.id}</span>
            </Modal.Header>
            <Modal.Body className="gap-3">
          <TextField value={code} onChange={setCode}>
            <Input placeholder="Код" />
          </TextField>
          <TextField value={title} onChange={setTitle}>
            <Input placeholder="Назва" />
          </TextField>
          <TextField value={info} onChange={setInfo}>
            <TextArea placeholder="Опис" rows={2} />
          </TextField>
          <YearRangesField value={years} onChange={setYears} />
          <OnlineCopiesField copies={inventory.online_copies} ops={copyOps} onChange={setCopyOps} />

          <Separator className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншим описом</span>
            <span className="text-xs text-muted">
              Усі справи цього опису буде перепривʼязано до обраного.
            </span>
            <CatalogSelect picker={mergePicker} label="Опис-приймач" value={mergeTargetId} onChange={setMergeTargetId} />
            <PendingButton size="sm" variant="secondary" onPress={handleMerge} isDisabled={!mergeTargetId} isPending={isMutating}>
              Об&apos;єднати
            </PendingButton>
          </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleSubmit} isPending={isMutating}>
                Надіслати на розгляд
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default InventoryEditModal;
