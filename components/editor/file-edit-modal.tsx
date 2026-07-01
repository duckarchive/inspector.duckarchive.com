"use client";

import { Key, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Divider } from "@heroui/divider";
import { addToast } from "@heroui/toast";
import YearRangesField from "@/components/editor/year-ranges-field";
import OnlineCopiesField, { emptyOnlineCopyOps, OnlineCopyOps } from "@/components/editor/online-copies-field";
import AuthorsField, { AuthorOps, emptyAuthorOps } from "@/components/editor/authors-field";
import LocationsField, { emptyLocationOps, LocationOps } from "@/components/editor/locations-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { useEditorFiles } from "@/hooks/useEditor";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";

interface FileEditModalProps {
  file: EditorFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FileEditModal: React.FC<FileEditModalProps> = ({ file, isOpen, onClose, onSubmitted }) => {
  const { submitMany, submitBatch, isMutating } = useSubmitAction("file");
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

    const bodies: SubmitActionBody[] = [];

    // Transfer all authors from source to target
    for (const authorId of file.authors.map((fa) => fa.author.id)) {
      bodies.push({ type: "disconnect_from_author", target_id: file.id, note: encodeNote({ v: 1, author_id: authorId }) });
      bodies.push({ type: "connect_to_author", target_id: mergeTargetId, note: encodeNote({ v: 1, author_id: authorId }) });
    }

    // Transfer all online copies from source to target
    for (const copyId of file.online_copies.map((c) => c.id)) {
      bodies.push({ type: "disconnect_from_online_copy", target_id: file.id, online_copy_id: copyId });
      bodies.push({ type: "connect_to_online_copy", target_id: mergeTargetId, online_copy_id: copyId });
    }

    // Transfer all locations from source to target
    for (const loc of file.locations) {
      bodies.push({
        type: "remove_location",
        target_id: file.id,
        note: encodeNote({ v: 1, field: "location", value: { lat: loc.lat, lng: loc.lng, radius_m: loc.radius_m } }),
      });
      bodies.push({
        type: "add_location",
        target_id: mergeTargetId,
        note: encodeNote({ v: 1, field: "location", value: { lat: loc.lat, lng: loc.lng, radius_m: loc.radius_m } }),
      });
    }

    // Merge year ranges: remove all from source, add only those not already on target
    const targetYears = mergeCandidates?.find((f) => f.id === mergeTargetId)?.years ?? [];
    for (const year of file.years) {
      bodies.push({ type: "remove_year_range", target_id: file.id, note: encodeNote({ v: 1, field: "year_range", value: year }) });
      if (!targetYears.some((y) => sameYearRange(y, year))) {
        bodies.push({ type: "add_year_range", target_id: mergeTargetId, note: encodeNote({ v: 1, field: "year_range", value: year }) });
      }
    }

    // Remove the source file after transferring all relations
    bodies.push({ type: "remove", target_id: file.id });

    if (bodies.length === 1) {
      // Only remove action, nothing to transfer
      addToast({ title: "Немає чого переносити", color: "default" });
      return;
    }

    await submitBatch(bodies);
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
      addToast({ title: "Немає змін", color: "default" });
      return;
    }

    await submitMany(bodies);
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Редагувати справу {file.full_code || file.code}</ModalHeader>
        <ModalBody className="gap-3">
          <Input label="Код" value={code} onValueChange={setCode} />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />
          <OnlineCopiesField copies={file.online_copies} target="file" ops={copyOps} onChange={setCopyOps} />
          <AuthorsField linked={linkedAuthors} ops={authorOps} onChange={setAuthorOps} />
          <LocationsField locations={file.locations} ops={locationOps} onChange={setLocationOps} />

          <Divider className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншою справою</span>
            <span className="text-xs text-default-500">
              Усі автори, локації та онлайн-копії цієї справи буде перенесено до обраної.
            </span>
            <Autocomplete
              size="sm"
              label="Справа-приймач"
              onSelectionChange={(key: Key | null) => setMergeTargetId(String(key ?? ""))}
              defaultItems={(mergeCandidates ?? []).filter((f) => f.id !== file.id)}
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

export default FileEditModal;
