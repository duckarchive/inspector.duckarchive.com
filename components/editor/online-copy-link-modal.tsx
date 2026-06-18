"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import InstancePicker from "@/components/editor/instance-picker";
import useSubmitAction from "@/hooks/useSubmitAction";
import { EditorOnlineCopy, OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface OnlineCopyLinkModalProps {
  copy: EditorOnlineCopy | null;
  target: OnlineCopyTarget;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const OnlineCopyLinkModal: React.FC<OnlineCopyLinkModalProps> = ({ copy, target, isOpen, onClose, onSubmitted }) => {
  const { submit, isMutating } = useSubmitAction(target);
  const [targetId, setTargetId] = useState("");

  useEffect(() => {
    if (copy) {
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Прив&apos;язати онлайн-копію</ModalHeader>
        <ModalBody className="gap-3">
          <p className="text-sm text-default-600 truncate">{copy.url}</p>
          <InstancePicker target={target} onChange={setTargetId} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isDisabled={!targetId} isLoading={isMutating}>
            Прив&apos;язати
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OnlineCopyLinkModal;
