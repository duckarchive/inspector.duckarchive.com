"use client";

import { useState } from "react";
import { Button, Input, Modal, TextArea, TextField, toast } from "@heroui/react";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
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
      toast.warning("Введіть назву автора");
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
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Додати нового автора</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
              <TextField value={title} onChange={setTitle} autoFocus>
                <Input placeholder="Назва" />
              </TextField>
              <TextField value={info} onChange={setInfo}>
                <TextArea placeholder="Опис" rows={2} />
              </TextField>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleSubmit} isPending={isMutating} isDisabled={!title.trim()}>
                Додати
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default AuthorAddModal;
