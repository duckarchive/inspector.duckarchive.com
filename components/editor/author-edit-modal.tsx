"use client";

import { Key, useEffect, useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@heroui/modal";
import { Button } from "@heroui/button";
import { Input, Textarea } from "@heroui/input";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { addToast } from "@heroui/toast";
import CoordinatesInput from "@/components/coordinates-input";
import useSubmitAction from "@/hooks/useSubmitAction";
import { useAuthorFiles, useEditorAuthors } from "@/hooks/useEditor";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";
import { encodeNote, SubmitActionBody } from "@/lib/editor-actions";
import { EditorAuthor } from "@/app/api/editor/authors/data";

interface AuthorEditModalProps {
  author: EditorAuthor | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const sameNum = (a: number | null, b: number | null) => (a ?? null) === (b ?? null);

const AuthorEditModal: React.FC<AuthorEditModalProps> = ({ author, isOpen, onClose, onSubmitted }) => {
  // Author edits are stored in file_actions; anchor to a linked file so the
  // (type, file_id) partial unique index applies per-file instead of globally.
  const { submitMany, isMutating } = useSubmitAction("file");
  const { data: authorFiles } = useAuthorFiles(author?.id);
  const anchorFileId = authorFiles?.file_ids[0] ?? null;

  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [coords, setCoords] = useState<{ lat?: string; lng?: string; radius_m?: number }>({});

  const [mergeQuery, setMergeQuery] = useState("");
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const { data: mergeCandidates } = useEditorAuthors(mergeQuery || undefined);

  useEffect(() => {
    if (author) {
      setTitle(author.title);
      setInfo(author.info ?? "");
      setTags(author.tags);
      setCoords({
        lat: author.lat != null ? String(author.lat) : undefined,
        lng: author.lng != null ? String(author.lng) : undefined,
      });
      setMergeQuery("");
      setMergeTargetId("");
    }
  }, [author]);

  if (!author) {
    return null;
  }

  const addTag = () => {
    const t = tagDraft.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagDraft("");
    }
  };

  const handleSubmit = async () => {
    const bodies: SubmitActionBody[] = [];
    const base = { target_id: anchorFileId };

    if (title !== author.title) {
      bodies.push({ ...base, type: "change_author_title", note: encodeNote({ v: 1, author_id: author.id, field: "title", value: title }) });
    }
    if (info !== (author.info ?? "")) {
      bodies.push({ ...base, type: "change_author_info", note: encodeNote({ v: 1, author_id: author.id, field: "info", value: info }) });
    }
    if (JSON.stringify(tags) !== JSON.stringify(author.tags)) {
      bodies.push({ ...base, type: "change_author_tags", note: encodeNote({ v: 1, author_id: author.id, field: "tags", value: tags }) });
    }
    const lat = coords.lat ? Number(coords.lat) : null;
    const lng = coords.lng ? Number(coords.lng) : null;
    if (!sameNum(lat, author.lat) || !sameNum(lng, author.lng)) {
      bodies.push({
        ...base,
        type: "change_author_location",
        note: encodeNote({ v: 1, author_id: author.id, field: "location", value: { lat, lng } }),
      });
    }

    if (bodies.length === 0) {
      addToast({ title: "Немає змін", color: "default" });
      return;
    }

    await submitMany(bodies);
    onSubmitted?.();
    onClose();
  };

  const handleMerge = async () => {
    if (!mergeTargetId || mergeTargetId === author.id) {
      return;
    }
    const sourceFiles = authorFiles?.file_ids ?? [];
    const bodies: SubmitActionBody[] = [];
    for (const fileId of sourceFiles) {
      bodies.push({ type: "disconnect_from_author", target_id: fileId, note: encodeNote({ v: 1, author_id: author.id }) });
      bodies.push({ type: "connect_to_author", target_id: fileId, note: encodeNote({ v: 1, author_id: mergeTargetId }) });
    }
    bodies.push({ type: "remove_author", target_id: sourceFiles[0] ?? null, note: encodeNote({ v: 1, author_id: author.id }) });

    await submitMany(bodies);
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader>Редагувати автора</ModalHeader>
        <ModalBody className="gap-3">
          <Input label="Назва" value={title} onValueChange={setTitle} />
          <Textarea label="Опис" value={info} onValueChange={setInfo} minRows={2} />

          <div className="flex flex-col gap-2">
            <span className="text-sm text-default-600">Теги</span>
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 && <span className="text-default-400 text-sm">Немає</span>}
              {tags.map((t) => (
                <Chip key={t} onClose={() => setTags(tags.filter((x) => x !== t))} variant="flat">
                  {t}
                </Chip>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <Input size="sm" label="Новий тег" value={tagDraft} onValueChange={setTagDraft} />
              <Button size="sm" onPress={addTag} isDisabled={!tagDraft.trim()}>
                Додати
              </Button>
            </div>
          </div>

          <CoordinatesInput value={coords} onChange={setCoords} />

          <Divider className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншим автором</span>
            <span className="text-xs text-default-500">
              Усі справи цього автора буде перепривʼязано до обраного, а цей автор — видалено.
            </span>
            <Autocomplete
              size="sm"
              label="Автор-приймач"
              inputValue={mergeQuery}
              onInputChange={setMergeQuery}
              onSelectionChange={(key: Key | null) => setMergeTargetId(String(key ?? ""))}
              items={(mergeCandidates ?? []).filter((a) => a.id !== author.id)}
              {...editorAutocompleteVirtualization}
            >
              {(a) => (
                <AutocompleteItem key={a.id} textValue={a.title} classNames={wrapItemClassNames}>
                  {a.title}
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

export default AuthorEditModal;
