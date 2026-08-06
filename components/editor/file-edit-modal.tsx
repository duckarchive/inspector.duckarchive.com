"use client";

import { Key, useEffect, useState } from "react";
import { Button, Input, Modal, Separator, TextArea, TextField, toast } from "@heroui/react";
import Select from "@/components/select";
import YearRangesField from "@/components/editor/year-ranges-field";
import OnlineCopiesField, { emptyOnlineCopyOps, OnlineCopyOps } from "@/components/editor/online-copies-field";
import AuthorsField, { AuthorOps, emptyAuthorOps } from "@/components/editor/authors-field";
import LocationsField, { emptyLocationOps, LocationOps } from "@/components/editor/locations-field";
import CatalogSelect from "@/components/editor/catalog-select";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { AddActionValue, encodeNote, sameYearRange, SubmitActionBody, YearRange } from "@/lib/editor-actions";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { useCatalogPicker } from "@/hooks/useCatalogPicker";
import { editorFilesEndpoint, editorFondsEndpoint } from "@/hooks/useEditor";
import { useGet } from "@/hooks/useApi";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { useIsAdmin } from "@/components/editor/admin-context";
import { FaTrash } from "react-icons/fa";

interface FileEditModalProps {
  file: EditorFile | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const FileEditModal: React.FC<FileEditModalProps> = ({ file, isOpen, onClose, onSubmitted }) => {
  const isAdmin = useIsAdmin();
  const { submit, submitMany, isMutating } = useSubmitAction("file");
  const { submit: submitInventory, isMutating: isSubmittingInventory } = useSubmitAction("inventory");
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [years, setYears] = useState<YearRange[]>([]);
  const [copyOps, setCopyOps] = useState<OnlineCopyOps>(emptyOnlineCopyOps());
  const [authorOps, setAuthorOps] = useState<AuthorOps>(emptyAuthorOps());
  const [locationOps, setLocationOps] = useState<LocationOps>(emptyLocationOps());

  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const mergePicker = useCatalogPicker<EditorFile>(editorFilesEndpoint(file?.inventory_id), mergeTargetId, file?.id);

  const [convertArchiveCode, setConvertArchiveCode] = useState("");
  const [convertFondId, setConvertFondId] = useState("");
  const { data: archives } = useGet<GetArchivesResponse>(isOpen ? "/api/archives" : null);
  const convertFondPicker = useCatalogPicker<EditorFond>(editorFondsEndpoint(convertArchiveCode), convertFondId);

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
      setConvertArchiveCode("");
      setConvertFondId("");
    }
  }, [file]);

  if (!file) {
    return null;
  }

  const linkedAuthors = file.authors.map((fa) => fa.author);
  const canConvertToInventory = linkedAuthors.length === 0 && file.locations.length === 0;

  const handleMerge = async () => {
    if (!mergeTargetId || mergeTargetId === file.id) {
      return;
    }
    await submit({
      type: "merge_to",
      target_id: file.id,
      note: encodeNote({ v: 1, field: "parent", value: mergeTargetId }),
    });
    onSubmitted?.();
    onClose();
  };

  const handleDelete = async () => {
    await submit({ type: "remove", target_id: file.id });
    onSubmitted?.();
    onClose();
  };

  /**
   * No dedicated "convert" action type exists (it would need a shared-schema
   * change), so this composes existing ones: create the inventory, unlink the
   * file's online copies (kept, not deleted — re-link them from the "без
   * прив'язки" page once the new opis is approved), then remove the file.
   * Approval order matters: if "remove" resolves before the disconnects, the
   * copies cascade-delete with the file.
   */
  const handleConvertToInventory = async () => {
    if (!convertFondId) {
      return;
    }
    const value: AddActionValue = {
      parent_id: convertFondId,
      code: file.code,
      title: file.title ?? undefined,
      info: file.info ?? undefined,
      years: file.years.map((y) => ({ start_year: y.start_year, end_year: y.end_year })),
    };
    await submitInventory({ type: "add", note: encodeNote({ v: 1, value }) });
    await submitMany([
      ...file.online_copies.map((copy) => ({
        type: "disconnect_from_online_copy" as const,
        target_id: file.id,
        online_copy_id: copy.id,
      })),
      { type: "remove", target_id: file.id },
    ]);
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
      bodies.push({
        type: "remove_year_range",
        target_id: id,
        note: encodeNote({ v: 1, field: "year_range", value: removed }),
      });
    }
    for (const added of years.filter((y) => !file.years.some((o) => sameYearRange(o, y)))) {
      bodies.push({
        type: "add_year_range",
        target_id: id,
        note: encodeNote({ v: 1, field: "year_range", value: added }),
      });
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
      bodies.push({
        type: "add_author",
        target_id: id,
        note: encodeNote({ v: 1, field: "title", value: authorTitle }),
      });
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
                <Input placeholder="Код" />
              </TextField>
              <TextField value={title} onChange={setTitle}>
                <Input placeholder="Назва" />
              </TextField>
              <TextField value={info} onChange={setInfo}>
                <TextArea placeholder="Опис" rows={2} />
              </TextField>
              <YearRangesField value={years} onChange={setYears} />
              <OnlineCopiesField copies={file.online_copies} ops={copyOps} onChange={setCopyOps} />
              <AuthorsField linked={linkedAuthors} ops={authorOps} onChange={setAuthorOps} />
              <LocationsField locations={file.locations} ops={locationOps} onChange={setLocationOps} />

              <Separator className="my-2" />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Об&apos;єднати з іншою справою</span>
                <span className="text-xs text-muted">
                  Усі автори, локації та онлайн-копії цієї справи буде перенесено до обраної.
                </span>
                <CatalogSelect
                  picker={mergePicker}
                  label="Справа-приймач"
                  value={mergeTargetId}
                  onChange={setMergeTargetId}
                />
                <PendingButton
                  size="sm"
                  variant="secondary"
                  onPress={handleMerge}
                  isDisabled={!mergeTargetId}
                  isPending={isMutating}
                >
                  Об&apos;єднати
                </PendingButton>
              </div>

              <Separator className="my-2" />

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Перетворити на опис</span>
                <span className="text-xs text-muted">
                  Буде створено новий опис у вибраному фонді з кодом, назвою, описом та роками цієї справи, онлайн-копії
                  буде відв&apos;язано (не видалено — прив&apos;яжіть їх до нового опису на сторінці «Онлайн-копії без
                  прив&apos;язки» після схвалення), а сама справа — видалена.
                </span>
                {!canConvertToInventory && (
                  <span className="text-xs text-danger">
                    Спочатку відв&apos;яжіть авторів та локації — опис не підтримує ці поля.
                  </span>
                )}
                <Select
                  items={(archives ?? []).sort((a, b) => a.code.localeCompare(b.code))}
                  label="Архів"
                  size="sm"
                  isDisabled={!canConvertToInventory}
                  getKey={(a) => a.code}
                  getTextValue={(a) => a.code}
                  renderItem={(a) => (
                    <div>
                      <p>{a.code}</p>
                      <p className="opacity-70 text-sm text-wrap">{a.title}</p>
                    </div>
                  )}
                  value={convertArchiveCode}
                  onChange={(key: Key | null) => {
                    setConvertArchiveCode(String(key ?? ""));
                    setConvertFondId("");
                  }}
                />
                <CatalogSelect
                  picker={convertFondPicker}
                  label="Фонд-приймач"
                  isDisabled={!canConvertToInventory || !convertArchiveCode}
                  value={convertFondId}
                  onChange={setConvertFondId}
                />
                <PendingButton
                  size="sm"
                  variant="secondary"
                  onPress={handleConvertToInventory}
                  isDisabled={!canConvertToInventory || !convertFondId}
                  isPending={isMutating || isSubmittingInventory}
                >
                  Перетворити на опис
                </PendingButton>
              </div>
            </Modal.Body>
            <Modal.Footer>
              {isAdmin && (
                <PendingButton
                  isIconOnly
                  aria-label="Видалити"
                  variant="ghost"
                  className="mr-auto"
                  onPress={handleDelete}
                  isPending={isMutating}
                >
                  <FaTrash />
                </PendingButton>
              )}
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
