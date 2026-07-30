"use client";

import { Key, useState } from "react";
import { Button, Input, Label, Modal, TextArea, TextField, toast } from "@heroui/react";
import Select from "@/components/select";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
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
      toast.warning("Введіть код фонду");
      return;
    }
    if (!archiveCode) {
      toast.warning("Виберіть архів");
      return;
    }

    const archive = archives.find((a) => a.code === archiveCode);
    if (!archive) {
      toast.danger("Архів не знайдено");
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
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Створити новий фонд</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
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
          <TextField value={code} onChange={setCode} autoFocus>
            <Label>Код</Label>
            <Input />
          </TextField>
          <TextField value={title} onChange={setTitle}>
            <Label>Назва</Label>
            <Input />
          </TextField>
          <TextField value={info} onChange={setInfo}>
            <Label>Опис</Label>
            <TextArea rows={2} />
          </TextField>
          <YearRangesField value={years} onChange={setYears} />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleSubmit} isPending={isMutating} isDisabled={!code.trim() || !archiveCode}>
                Створити
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default FondAddModal;
