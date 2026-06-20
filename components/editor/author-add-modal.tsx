"use client";

import { useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, SubmitActionBody } from "@/lib/editor-actions";

interface AuthorAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const AuthorAddModal: React.FC<AuthorAddModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const { submitMany, isMutating } = useSubmitAction("file");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");

  const handleSubmit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      addToast({ title: "Введіть назву автора", color: "warning" });
      return;
    }

    const bodies: SubmitActionBody[] = [
      { type: "add_author", target_id: null, note: encodeNote({ v: 1, field: "title", value: trimmedTitle }) },
    ];

    if (info.trim()) {
      bodies.push({ type: "change_author_info", target_id: null, note: encodeNote({ v: 1, field: "info", value: info }) });
    }

    await submitMany(bodies);
    setTitle("");
    setInfo("");
    onSubmitted?.();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalContent>
        <ModalHeader>Додати нового автора</ModalHeader>
        <ModalBody className="gap-3">
          <Input label="Назва" value={title} onValueChange={setTitle} autoFocus />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isMutating} isDisabled={!title.trim()}>
            Додати
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default AuthorAddModal;
