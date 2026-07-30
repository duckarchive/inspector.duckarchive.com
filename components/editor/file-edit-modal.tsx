"use client";

import { Key, useEffect, useState } from "react";
import { Button, Input, Label, Modal, Separator, TextArea, TextField, toast } from "@heroui/react";
import Select from "@/components/select";
import YearRangesField from "@/components/editor/year-ranges-field";
import OnlineCopiesField, { emptyOnlineCopyOps, OnlineCopyOps } from "@/components/editor/online-copies-field";
import AuthorsField, { AuthorOps, emptyAuthorOps } from "@/components/editor/authors-field";
import LocationsField, { emptyLocationOps, LocationOps } from "@/components/editor/locations-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { useEditorFiles } from "@/hooks/useEditor";

interface FileEditModalProps {
  file: EditorFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FileEditModal: React.FC<FileEditModalProps> = ({ file, isOpen, onClose, onSubmitted }) => {
  const { submit, submitMany, isMutating } = useSubmitAction("file");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [years, setYears] = useState<YearRange[]>([]);
  const [copyOps, setCopyOps] = useState<OnlineCopyOps>(emptyOnlineCopyOps());
  const [authorOps, setAuthorOps] = useState<AuthorOps>(emptyAuthorOps());
  const [locationOps, setLocationOps] = useState<LocationOps>(emptyLocationOps());

  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const { data: mergeCandidates } = useEditorFiles(file?.inventory_id || undefined);

  useEffect(() => {
    if (file) {
      setCode(file.code);
      setTitle(file.title ?? "");
      setInfo(file.info ?? "");
      setYears(file.years.map((y) => ({ start_year: y.start_year, end_year: y.end_year })));
      setCopyOps(emptyOnlineCopyOps());
      setAuthorOps(emptyAuthorOps());
      setLocationOps(emptyLocationOps());
      setMergeTargetId("");
    }
  }, [file]);

  if (!file) {
    return null;
  }

  const linkedAuthors = file.authors.map((fa) => fa.author);

  const handleMerge = async () => {
    if (!mergeTargetId || mergeTargetId === file.id) {
      return;
    }
    await submit({ type: "merge_to", target_id: file.id, note: encodeNote({ v: 1, field: "parent", value: mergeTargetId }) });
    onSubmitted?.();
    onClose();
  };

  const handleSubmit = async () => {
    const id = file.id;
    const bodies: SubmitActionBody[] = [];

    if (code !== file.code) {
      bodies.push({ type: "change_code", target_id: id, note: encodeNote({ v: 1, field: "code", value: code }) });
    }
    if (title !== (file.title ?? "")) {
      bodies.push({ type: "change_title", target_id: id, note: encodeNote({ v: 1, field: "title", value: title }) });
    }
    if (info !== (file.info ?? "")) {
      bodies.push({ type: "change_info", target_id: id, note: encodeNote({ v: 1, field: "info", value: info }) });
    }
    for (const removed of file.years.filter((o) => !years.some((y) => sameYearRange(y, o)))) {
      bodies.push({ type: "remove_year_range", target_id: id, note: encodeNote({ v: 1, field: "year_range", value: removed }) });
    }
    for (const added of years.filter((y) => !file.years.some((o) => sameYearRange(o, y)))) {
      bodies.push({ type: "add_year_range", target_id: id, note: encodeNote({ v: 1, field: "year_range", value: added }) });
    }

    // online copies
    for (const copyId of copyOps.connect) {
      bodies.push({ type: "connect_to_online_copy", target_id: id, online_copy_id: copyId });
    }
    for (const copyId of copyOps.disconnect) {
      bodies.push({ type: "disconnect_from_online_copy", target_id: id, online_copy_id: copyId });
    }

    // authors
    for (const authorId of authorOps.disconnect) {
      bodies.push({ type: "disconnect_from_author", target_id: id, note: encodeNote({ v: 1, author_id: authorId }) });
    }
    for (const authorId of authorOps.connect) {
      bodies.push({ type: "connect_to_author", target_id: id, note: encodeNote({ v: 1, author_id: authorId }) });
    }
    for (const authorTitle of authorOps.addNew) {
      bodies.push({ type: "add_author", target_id: id, note: encodeNote({ v: 1, field: "title", value: authorTitle }) });
    }

    // locations
    for (const locId of locationOps.remove) {
      const loc = file.locations.find((l) => l.id === locId);
      if (loc) {
        bodies.push({
          type: "remove_location",
          target_id: id,
          note: encodeNote({ v: 1, field: "location", value: { lat: loc.lat, lng: loc.lng, radius_m: loc.radius_m } }),
        });
      }
    }
    for (const loc of locationOps.add) {
      bodies.push({ type: "add_location", target_id: id, note: encodeNote({ v: 1, field: "location", value: loc }) });
    }

    if (bodies.length === 0) {
      toast("Немає змін");
      return;
    }

    await submitMany(bodies);
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
              <Modal.Heading>Редагувати справу {file.full_code || file.code}</Modal.Heading>
              <span className="text-xs font-normal text-muted select-all">{file.id}</span>
            </Modal.Header>
            <Modal.Body className="gap-3">
          <TextField value={code} onChange={setCode}>
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
          <OnlineCopiesField copies={file.online_copies} target="file" ops={copyOps} onChange={setCopyOps} />
          <AuthorsField linked={linkedAuthors} ops={authorOps} onChange={setAuthorOps} />
          <LocationsField locations={file.locations} ops={locationOps} onChange={setLocationOps} />

          <Separator className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншою справою</span>
            <span className="text-xs text-muted">
              Усі автори, локації та онлайн-копії цієї справи буде перенесено до обраної.
            </span>
            <Select
              label="Справа-приймач"
              virtualized
              items={(mergeCandidates ?? []).filter((f) => f.id !== file.id)}
              getKey={(f) => f.id}
              getTextValue={(f) => f.code}
              renderItem={(f) => (
                <div>
                  <p>{f.code}</p>
                  <p className="opacity-70 text-sm">{f.title}</p>
                </div>
              )}
              onChange={(key: Key | null) => setMergeTargetId(String(key ?? ""))}
            />
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

export default FileEditModal;
