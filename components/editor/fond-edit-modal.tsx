"use client";

import { Key, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Divider } from "@heroui/divider";
import { addToast } from "@heroui/toast";
import Select from "@/components/select";
import YearRangesField from "@/components/editor/year-ranges-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { useEditorFonds } from "@/hooks/useEditor";
import { Archives } from "@/data/archives";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";

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
  const { data: mergeCandidates } = useEditorFonds(archiveCode || undefined);

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
      addToast({ title: "Немає змін", color: "default" });
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
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Редагувати фонд {fond.code}</ModalHeader>
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
            onChange={(key) => setArchiveCode(String(key ?? ""))}
          />
          <Input label="Код" value={code} onValueChange={setCode} />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />

          <Divider className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншим фондом</span>
            <span className="text-xs text-default-500">
              Усі описи цього фонду буде перепривʼязано до обраного.
            </span>
            <Autocomplete
              size="sm"
              label="Фонд-приймач"
              onSelectionChange={(key: Key | null) => setMergeTargetId(String(key ?? ""))}
              defaultItems={(mergeCandidates ?? []).filter((f) => f.id !== fond.id)}
              {...editorAutocompleteVirtualization}
            >
              {(f) => (
                <AutocompleteItem key={f.id} textValue={f.code} classNames={wrapItemClassNames}>
                  <div>
                    <p>{f.code}</p>
                    <p className="opacity-70 text-sm">{f.title}</p>
                  </div>
                </AutocompleteItem>
              )}
            </Autocomplete>
            <Button size="sm" color="warning" variant="flat" onPress={handleMerge} isDisabled={!mergeTargetId} isLoading={isMutating}>
              Об&apos;єднати
            </Button>
          </div>
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
