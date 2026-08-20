"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Button, Link, Modal, TextArea, TextField } from "@heroui/react";
import { FaBug } from "react-icons/fa";
import { EditorEntity } from "@/lib/editor-actions";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";

interface ReportButtonProps {
  entity: EditorEntity;
  targetId?: string;
  editorHref?: string;
}

const ReportButton: React.FC<ReportButtonProps> = ({ entity, targetId, editorHref }) => {
  const { status } = useSession();
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

  if (status !== "authenticated") return null;

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        isIconOnly
        aria-label="Повідомити про помилку"
        isDisabled={!targetId}
        onPress={() => setIsOpen(true)}
      >
        <FaBug />
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
                {editorHref ? (
                  <Link href={editorHref} target="_blank" rel="noopener noreferrer" className="text-sm self-start">
                    Відкрити в редакторі ↗
                  </Link>
                ) : null}
                <TextField value={note} onChange={setNote}>
                  <TextArea placeholder="Опис помилки — наприклад: неправильний рік, помилка в назві тощо" rows={3} />
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
