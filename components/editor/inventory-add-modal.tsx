"use client";

import { useEffect, useState } from "react";
import { Button, Input, Label, Modal, TextArea, TextField, toast } from "@heroui/react";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { AddActionValue, encodeNote, YearRange } from "@/lib/editor-actions";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";

interface InventoryAddModalProps {
  fond: EditorFond | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const InventoryAddModal: React.FC<InventoryAddModalProps> = ({ fond, isOpen, onClose, onSubmitted }) => {
  const { submit, isMutating } = useSubmitAction("inventory");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [years, setYears] = useState<YearRange[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setTitle("");
      setInfo("");
      setYears([]);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      toast.warning("Введіть код опису");
      return;
    }
    if (!fond) {
      toast.warning("Фонд не вибраний");
      return;
    }

    // the new опис doesn't exist yet, so everything rides in the note payload;
    // the executor creates it (with years) when the action is approved
    const value: AddActionValue = {
      parent_id: fond.id,
      code: code.trim(),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(info.trim() ? { info: info.trim() } : {}),
      ...(years.length ? { years } : {}),
    };
    await submit({ type: "add", note: encodeNote({ v: 1, field: "parent", value }) });
    onSubmitted?.();
    onClose();
  };

  if (!isOpen || !fond) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Створити новий опис</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
          <TextField value={code} onChange={setCode} autoFocus>
            <Label>Код</Label>
            <Input />
          </TextField>
          <TextField value={title} onChange={setTitle}>
            <Label>Назва</Label>
            <Input />
          </TextField>
          <TextField value={info} onChange={setInfo}>
            <Label>Опис</Label>
            <TextArea rows={2} />
          </TextField>
          <YearRangesField value={years} onChange={setYears} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleSubmit} isPending={isMutating} isDisabled={!code.trim()}>
                Створити
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default InventoryAddModal;
