"use client";

import { Key, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import Select from "@/components/select";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { AddActionValue, encodeNote, YearRange } from "@/lib/editor-actions";
import { Archives } from "@/data/archives";

interface FondAddModalProps {
  archives: Archives;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FondAddModal: React.FC<FondAddModalProps> = ({ archives, isOpen, onClose, onSubmitted }) => {
  const { submit, isMutating } = useSubmitAction("fond");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [archiveCode, setArchiveCode] = useState<string>("");
  const [years, setYears] = useState<YearRange[]>([]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      addToast({ title: "Введіть код фонду", color: "warning" });
      return;
    }
    if (!archiveCode) {
      addToast({ title: "Виберіть архів", color: "warning" });
      return;
    }

    const archive = archives.find((a) => a.code === archiveCode);
    if (!archive) {
      addToast({ title: "Архів не знайдено", color: "danger" });
      return;
    }

    // the new fond doesn't exist yet, so everything rides in the note payload;
    // the executor creates it (with years) when the action is approved
    const value: AddActionValue = {
      parent_id: archive.id,
      code: code.trim(),
      ...(title.trim() ? { title: title.trim() } : {}),
      ...(info.trim() ? { info: info.trim() } : {}),
      ...(years.length ? { years } : {}),
    };
    await submit({ type: "add", note: encodeNote({ v: 1, field: "parent", value }) });
    setCode("");
    setTitle("");
    setInfo("");
    setArchiveCode("");
    setYears([]);
    onSubmitted?.();
    onClose();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Створити новий фонд</ModalHeader>
        <ModalBody className="gap-3">
          <Select
            items={(archives ?? []).sort((a, b) => a.code.localeCompare(b.code))}
            label="Архів"
            getKey={(a) => a.code}
            getTextValue={(a) => a.code}
            renderItem={(a) => (
              <div>
                <p>{a.code}</p>
                <p className="opacity-70 text-sm text-wrap">{a.title}</p>
              </div>
            )}
            value={archiveCode}
            onChange={(key: Key | null) => setArchiveCode(String(key ?? ""))}
          />
          <Input label="Код" value={code} onValueChange={setCode} autoFocus />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isMutating} isDisabled={!code.trim() || !archiveCode}>
            Створити
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FondAddModal;
