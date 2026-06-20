"use client";

import { Key, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import Select from "@/components/select";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { Archives } from "@/data/archives";

interface FondAddModalProps {
  archives: Archives;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FondAddModal: React.FC<FondAddModalProps> = ({ archives, isOpen, onClose, onSubmitted }) => {
  const { submitMany, isMutating } = useSubmitAction("fond");
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

    const bodies: SubmitActionBody[] = [
      {
        type: "add",
        target_id: archive.id,
        note: encodeNote({ v: 1, field: "code", value: code.trim() }),
      },
    ];

    if (title.trim()) {
      bodies.push({
        type: "change_title",
        target_id: archive.id,
        note: encodeNote({ v: 1, field: "title", value: title.trim() }),
      });
    }
    if (info.trim()) {
      bodies.push({
        type: "change_info",
        target_id: archive.id,
        note: encodeNote({ v: 1, field: "info", value: info.trim() }),
      });
    }

    for (const year of years) {
      bodies.push({
        type: "add_year_range",
        target_id: archive.id,
        note: encodeNote({ v: 1, field: "year_range", value: year }),
      });
    }

    await submitMany(bodies);
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
