"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import InstancePicker from "@/components/editor/instance-picker";
import useSubmitAction from "@/hooks/useSubmitAction";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface OnlineCopyAddModalProps {
  target: OnlineCopyTarget;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const OnlineCopyAddModal: React.FC<OnlineCopyAddModalProps> = ({ target, isOpen, onClose, onSubmitted }) => {
  const { submit, isMutating } = useSubmitAction(target);
  const [targetId, setTargetId] = useState("");
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (isOpen) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Додати онлайн-копію</ModalHeader>
        <ModalBody className="gap-3">
          <Input label="URL онлайн-копії" value={url} onValueChange={setUrl} />
          <InstancePicker target={target} onChange={setTargetId} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isDisabled={!targetId || !url.trim()} isLoading={isMutating}>
            Надіслати на розгляд
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OnlineCopyAddModal;
