"use client";

import { useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { addToast } from "@heroui/toast";
import YearRangesField from "@/components/editor/year-ranges-field";
import OnlineCopiesField, { emptyOnlineCopyOps, OnlineCopyOps } from "@/components/editor/online-copies-field";
import AuthorsField, { AuthorOps, emptyAuthorOps } from "@/components/editor/authors-field";
import LocationsField, { emptyLocationOps, LocationOps } from "@/components/editor/locations-field";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFile } from "@/app/api/editor/catalog/files/data";

interface FileEditModalProps {
  file: EditorFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FileEditModal: React.FC<FileEditModalProps> = ({ file, isOpen, onClose, onSubmitted }) => {
  const { submitMany, isMutating } = useSubmitAction("file");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [years, setYears] = useState<YearRange[]>([]);
  const [copyOps, setCopyOps] = useState<OnlineCopyOps>(emptyOnlineCopyOps());
  const [authorOps, setAuthorOps] = useState<AuthorOps>(emptyAuthorOps());
  const [locationOps, setLocationOps] = useState<LocationOps>(emptyLocationOps());

  useEffect(() => {
    if (file) {
      setCode(file.code);
      setTitle(file.title ?? "");
      setInfo(file.info ?? "");
      setYears(file.years.map((y) => ({ start_year: y.start_year, end_year: y.end_year })));
      setCopyOps(emptyOnlineCopyOps());
      setAuthorOps(emptyAuthorOps());
      setLocationOps(emptyLocationOps());
    }
  }, [file]);

  if (!file) {
    return null;
  }

  const linkedAuthors = file.authors.map((fa) => fa.author);

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
          <Input label="Індекс" value={code} onValueChange={setCode} />
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />
          <YearRangesField value={years} onChange={setYears} />
          <OnlineCopiesField copies={file.online_copies} target="file" ops={copyOps} onChange={setCopyOps} />
          <AuthorsField linked={linkedAuthors} ops={authorOps} onChange={setAuthorOps} />
          <LocationsField locations={file.locations} ops={locationOps} onChange={setLocationOps} />
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
