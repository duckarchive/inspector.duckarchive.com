"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
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
      addToast({ title: "Введіть код опису", color: "warning" });
      return;
    }
    if (!fond) {
      addToast({ title: "Фонд не вибраний", color: "warning" });
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Створити новий опис</ModalHeader>
        <ModalBody className="gap-3">
          <Input label="Код" value={code} onValueChange={setCode} autoFocus />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isMutating} isDisabled={!code.trim()}>
            Створити
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default InventoryAddModal;
