"use client";

import { useEffect, useState } from "react";
import { Button, ButtonGroup, Modal } from "@heroui/react";
import InstancePicker from "@/components/editor/instance-picker";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { EditorOnlineCopy, OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface OnlineCopyLinkModalProps {
  copy: EditorOnlineCopy | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const OnlineCopyLinkModal: React.FC<OnlineCopyLinkModalProps> = ({ copy, isOpen, onClose, onSubmitted }) => {
  const [target, setTarget] = useState<OnlineCopyTarget>("inventory");
  const { submit, isMutating } = useSubmitAction(target);
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (copy) {
      setTarget("inventory");
      setTargetId("");
    }
  }, [copy]);

  if (!copy) {
    return null;
  }

  const handleSubmit = async () => {
    if (!targetId) {
      return;
    }
    await submit({ type: "connect_to_online_copy", target_id: targetId, online_copy_id: copy.id });
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Прив&apos;язати онлайн-копію</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
              <p className="text-sm text-muted truncate">{copy.url}</p>
              <ButtonGroup>
                <Button
                  variant={target === "inventory" ? "primary" : "tertiary"}
                  onPress={() => {
                    setTarget("inventory");
                    setTargetId("");
                  }}
                >
                  Опис
                </Button>
                <Button
                  variant={target === "file" ? "primary" : "tertiary"}
                  onPress={() => {
                    setTarget("file");
                    setTargetId("");
                  }}
                >
                  Справа
                </Button>
              </ButtonGroup>
              <InstancePicker key={target} target={target} onChange={setTargetId} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleSubmit} isDisabled={!targetId} isPending={isMutating}>
                Прив&apos;язати
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default OnlineCopyLinkModal;
