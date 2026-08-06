"use client";

import { useEffect, useState } from "react";
import { Button, Input, Modal, Separator, TextArea, TextField, toast } from "@heroui/react";
import Select from "@/components/select";
import CatalogSelect from "@/components/editor/catalog-select";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { useCatalogPicker } from "@/hooks/useCatalogPicker";
import { editorFondsEndpoint } from "@/hooks/useEditor";
import { Archives } from "@/data/archives";

interface FondEditModalProps {
  fond: EditorFond | null;
  archives: Archives;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FondEditModal: React.FC<FondEditModalProps> = ({ fond, archives, isOpen, onClose, onSubmitted }) => {
  const { submit: submitFondAction, submitMany: submitFondActions, isMutating } = useSubmitAction("fond");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [archiveCode, setArchiveCode] = useState<string>("");
  const [years, setYears] = useState<YearRange[]>([]);

  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const mergePicker = useCatalogPicker<EditorFond>(editorFondsEndpoint(archiveCode), mergeTargetId, fond?.id);

  useEffect(() => {
    if (fond) {
      setCode(fond.code);
      setTitle(fond.title ?? "");
      setInfo(fond.info ?? "");
      setArchiveCode(fond.archive.code);
      setYears(fond.years.map((y) => ({ start_year: y.start_year, end_year: y.end_year })));
      setMergeTargetId("");
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
      bodies.push({
        type: "change_title",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "title", value: title }),
      });
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
      bodies.push({
        type: "remove_year_range",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "year_range", value: removed }),
      });
    }
    for (const added of years.filter((y) => !fond.years.some((o) => sameYearRange(o, y)))) {
      bodies.push({
        type: "add_year_range",
        target_id: fond.id,
        note: encodeNote({ v: 1, field: "year_range", value: added }),
      });
    }

    if (bodies.length === 0) {
      toast("Немає змін");
      return;
    }

    await submitFondActions(bodies);
    onSubmitted?.();
    onClose();
  };

  const handleMerge = async () => {
    if (!mergeTargetId || mergeTargetId === fond.id) {
      return;
    }
    await submitFondAction({ type: "merge_to", target_id: fond.id, note: encodeNote({ v: 1, field: "parent", value: mergeTargetId }) });
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header className="flex flex-col gap-0.5">
              <Modal.Heading>Редагувати фонд {fond.code}</Modal.Heading>
              <span className="text-xs font-normal text-muted select-all">{fond.id}</span>
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
            onChange={(key) => setArchiveCode(String(key ?? ""))}
          />
          <TextField value={code} onChange={setCode}>
            <Input placeholder="Код" />
          </TextField>
          <TextField value={title} onChange={setTitle}>
            <Input placeholder="Назва" />
          </TextField>
          <TextField value={info} onChange={setInfo}>
            <TextArea placeholder="Опис" rows={2} />
          </TextField>
          <YearRangesField value={years} onChange={setYears} />

          <Separator className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншим фондом</span>
            <span className="text-xs text-muted">
              Усі описи цього фонду буде перепривʼязано до обраного.
            </span>
            <CatalogSelect picker={mergePicker} label="Фонд-приймач" value={mergeTargetId} onChange={setMergeTargetId} />
            <PendingButton size="sm" variant="secondary" onPress={handleMerge} isDisabled={!mergeTargetId} isPending={isMutating}>
              Об&apos;єднати
            </PendingButton>
          </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleSubmit} isPending={isMutating}>
                Надіслати на розгляд
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default FondEditModal;
