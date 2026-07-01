"use client";

import { useState } from "react";
import { Button } from "@heroui/button";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Textarea } from "@heroui/input";
import { EditorEntity } from "@/lib/editor-actions";
import useSubmitAction from "@/hooks/useSubmitAction";

interface ReportButtonProps {
  entity: EditorEntity;
  targetId?: string;
}

const ReportButton: React.FC<ReportButtonProps> = ({ entity, targetId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const { submit, isMutating } = useSubmitAction(entity);

  const close = () => {
    setIsOpen(false);
    setNote("");
  };

  const handleSubmit = async () => {
    try {
      await submit({ type: "report", target_id: targetId, note: note.trim() || undefined });
      close();
    } catch {
      // error already toasted by useSubmitAction
    }
  };

  return (
    <>
      <Button size="sm" variant="light" color="warning" isDisabled={!targetId} onPress={() => setIsOpen(true)}>
        Повідомити про помилку
      </Button>
      <Modal isOpen={isOpen} onClose={close}>
        <ModalContent>
          <ModalHeader>Повідомити про помилку</ModalHeader>
          <ModalBody className="gap-3">
            <p className="text-sm text-default-500">
              Опишіть, що саме є неправильним у цьому записі. Адміністратор розгляне ваше повідомлення.
            </p>
            <Textarea
              label="Опис помилки"
              placeholder="Наприклад: неправильний рік, помилка в назві тощо"
              value={note}
              onValueChange={setNote}
              minRows={3}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={close}>
              Скасувати
            </Button>
            <Button color="warning" onPress={handleSubmit} isLoading={isMutating} isDisabled={!note.trim()}>
              Надіслати
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ReportButton;
