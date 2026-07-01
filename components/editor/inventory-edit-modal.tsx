"use client";

import { Key, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Divider } from "@heroui/divider";
import { addToast } from "@heroui/toast";
import YearRangesField from "@/components/editor/year-ranges-field";
import OnlineCopiesField, { emptyOnlineCopyOps, OnlineCopyOps } from "@/components/editor/online-copies-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";
import { useEditorInventories } from "@/hooks/useEditor";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";

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
  const { data: mergeCandidates } = useEditorInventories(inventory?.fond_id || undefined);

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
      addToast({ title: "Немає змін", color: "default" });
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Редагувати опис {inventory.code}</ModalHeader>
        <ModalBody className="gap-3">
          <Input label="Код" value={code} onValueChange={setCode} />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />
          <OnlineCopiesField copies={inventory.online_copies} target="inventory" ops={copyOps} onChange={setCopyOps} />

          <Divider className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншим описом</span>
            <span className="text-xs text-default-500">
              Усі справи цього опису буде перепривʼязано до обраного.
            </span>
            <Autocomplete
              size="sm"
              label="Опис-приймач"
              onSelectionChange={(key: Key | null) => setMergeTargetId(String(key ?? ""))}
              defaultItems={(mergeCandidates ?? []).filter((i) => i.id !== inventory.id)}
              {...editorAutocompleteVirtualization}
            >
              {(i) => (
                <AutocompleteItem key={i.id} textValue={i.code} classNames={wrapItemClassNames}>
                  <div>
                    <p>{i.code}</p>
                    <p className="opacity-70 text-sm">{i.title}</p>
                  </div>
                </AutocompleteItem>
              )}
            </Autocomplete>
            <Button size="sm" color="warning" variant="flat" onPress={handleMerge} isDisabled={!mergeTargetId} isLoading={isMutating}>
              Об&apos;єднати
            </Button>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isMutating}>
            Надіслати на розгляд
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InventoryEditModal;
