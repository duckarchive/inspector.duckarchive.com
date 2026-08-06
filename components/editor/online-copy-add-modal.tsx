"use client";

import { useEffect, useState } from "react";
import { Button, ButtonGroup, Input, Modal, TextField } from "@heroui/react";
import InstancePicker from "@/components/editor/instance-picker";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface OnlineCopyAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const OnlineCopyAddModal: React.FC<OnlineCopyAddModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const [target, setTarget] = useState<OnlineCopyTarget>("inventory");
  const { submit, isMutating } = useSubmitAction(target);
  const [targetId, setTargetId] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
      setTarget("inventory");
      setTargetId("");
      setUrl("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!targetId || !url.trim()) {
      return;
    }
    await submit({ type: "add_online_copy", target_id: targetId, note: url.trim() });
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
              <Modal.Heading>Додати онлайн-копію</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
              <TextField value={url} onChange={setUrl}>
                <Input placeholder="URL онлайн-копії" />
              </TextField>
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
              <PendingButton onPress={handleSubmit} isDisabled={!targetId || !url.trim()} isPending={isMutating}>
                Надіслати на розгляд
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default OnlineCopyAddModal;
