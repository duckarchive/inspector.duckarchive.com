"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import SelectArchive from "@/components/select-archive";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { Archives } from "@/data/archives";

interface FondEditModalProps {
  fond: EditorFond | null;
  archives: Archives;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FondEditModal: React.FC<FondEditModalProps> = ({ fond, archives, isOpen, onClose, onSubmitted }) => {
  const { submitMany, isMutating } = useSubmitAction("fond");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [archiveCode, setArchiveCode] = useState<string>("");
  const [years, setYears] = useState<YearRange[]>([]);

  useEffect(() => {
    if (fond) {
      setCode(fond.code);
      setTitle(fond.title ?? "");
      setInfo(fond.info ?? "");
      setArchiveCode(fond.archive.code);
      setYears(fond.years.map((y) => ({ start_year: y.start_year, end_year: y.end_year })));
    }
  }, [fond]);

  if (!fond) {
    return null;
  }

  const handleSubmit = async () => {
    const bodies: SubmitActionBody[] = [];

    if (code !== fond.code) {
      bodies.push({ type: "change_code", target_id: fond.id, note: encodeNote({ v: 1, field: "code", value: code }) });
    }
    if (title !== (fond.title ?? "")) {
      bodies.push({ type: "change_title", target_id: fond.id, note: encodeNote({ v: 1, field: "title", value: title }) });
    }
    if (info !== (fond.info ?? "")) {
      bodies.push({ type: "change_info", target_id: fond.id, note: encodeNote({ v: 1, field: "info", value: info }) });
    }
    if (archiveCode !== fond.archive.code) {
      const archive = archives.find((a) => a.code === archiveCode);
      if (archive) {
        bodies.push({
          type: "change_parent",
          target_id: fond.id,
          note: encodeNote({ v: 1, field: "parent", value: archive.id }),
        });
      }
    }

    for (const removed of fond.years.filter((o) => !years.some((y) => sameYearRange(y, o)))) {
      bodies.push({ type: "remove_year_range", target_id: fond.id, note: encodeNote({ v: 1, field: "year_range", value: removed }) });
    }
    for (const added of years.filter((y) => !fond.years.some((o) => sameYearRange(o, y)))) {
      bodies.push({ type: "add_year_range", target_id: fond.id, note: encodeNote({ v: 1, field: "year_range", value: added }) });
    }

    if (bodies.length === 0) {
      addToast({ title: "Немає змін", color: "default" });
      return;
    }

    await submitMany(bodies);
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Редагувати фонд {fond.code}</ModalHeader>
        <ModalBody className="gap-3">
          <SelectArchive archives={archives} value={archiveCode} onChange={(key) => setArchiveCode(String(key ?? ""))} />
          <Input label="Індекс" value={code} onValueChange={setCode} />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            Скасувати
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isMutating}>
            Надіслати на розгляд
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default FondEditModal;
