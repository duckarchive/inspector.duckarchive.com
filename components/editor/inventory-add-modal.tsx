"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";

interface InventoryAddModalProps {
  fond: EditorFond | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const InventoryAddModal: React.FC<InventoryAddModalProps> = ({ fond, isOpen, onClose, onSubmitted }) => {
  const { submitMany, isMutating } = useSubmitAction("inventory");
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

    const bodies: SubmitActionBody[] = [
      {
        type: "add",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "code", value: code.trim() }),
      },
    ];

    if (title.trim()) {
      bodies.push({
        type: "change_title",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "title", value: title.trim() }),
      });
    }
    if (info.trim()) {
      bodies.push({
        type: "change_info",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "info", value: info.trim() }),
      });
    }

    for (const year of years) {
      bodies.push({
        type: "add_year_range",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "year_range", value: year }),
      });
    }

    await submitMany(bodies);
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
