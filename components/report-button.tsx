"use client";

import { useState } from "react";
import { Button, Label, Modal, TextArea, TextField } from "@heroui/react";
import { EditorEntity } from "@/lib/editor-actions";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";

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
      <Button size="sm" variant="tertiary" isDisabled={!targetId} onPress={() => setIsOpen(true)}>
        Повідомити про помилку
      </Button>
      <Modal isOpen={isOpen} onOpenChange={(open) => !open && close()}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Повідомити про помилку</Modal.Heading>
              </Modal.Header>
              <Modal.Body className="gap-3">
                <p className="text-sm text-muted">
                  Опишіть, що саме є неправильним у цьому записі. Адміністратор розгляне ваше повідомлення.
                </p>
                <TextField value={note} onChange={setNote}>
                  <Label>Опис помилки</Label>
                  <TextArea placeholder="Наприклад: неправильний рік, помилка в назві тощо" rows={3} />
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" onPress={close}>
                  Скасувати
                </Button>
                <PendingButton onPress={handleSubmit} isPending={isMutating} isDisabled={!note.trim()}>
                  Надіслати
                </PendingButton>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};

export default ReportButton;
