"use client";

import { Key, useEffect, useState } from "react";
import { Button, Chip, CloseButton, Input, Label, Modal, Separator, TextArea, TextField, toast } from "@heroui/react";
import Select from "@/components/select";
import CoordinatesInput from "@/components/coordinates-input";
import useSubmitAction from "@/hooks/useSubmitAction";
import PendingButton from "@/components/pending-button";
import { useAuthorFiles, useEditorAuthors } from "@/hooks/useEditor";
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
      toast("Немає змін");
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
    // one pending action; on approve the executor re-links every file, merges
    // the author fields and deletes the source — all under the hood
    await submitMany([
      { type: "merge_to", note: encodeNote({ v: 1, author_id: author.id, value: mergeTargetId }) },
    ]);
    onSubmitted?.();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Редагувати автора</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
          <TextField value={title} onChange={setTitle}>
            <Label>Назва</Label>
            <Input />
          </TextField>
          <TextField value={info} onChange={setInfo}>
            <Label>Опис</Label>
            <TextArea rows={2} />
          </TextField>

          <div className="flex flex-col gap-2">
            <span className="text-sm text-muted">Теги</span>
            <div className="flex flex-wrap gap-1">
              {tags.length === 0 && <span className="text-muted text-sm">Немає</span>}
              {tags.map((t) => (
                <Chip key={t} variant="soft">
                  {t}
                  <CloseButton aria-label="Видалити тег" onPress={() => setTags(tags.filter((x) => x !== t))} />
                </Chip>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <TextField value={tagDraft} onChange={setTagDraft}>
                <Label>Новий тег</Label>
                <Input />
              </TextField>
              <Button size="sm" onPress={addTag} isDisabled={!tagDraft.trim()}>
                Додати
              </Button>
            </div>
          </div>

          <CoordinatesInput value={coords} onChange={setCoords} />

          <Separator className="my-2" />

          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">Об&apos;єднати з іншим автором</span>
            <span className="text-xs text-muted">
              Усі справи цього автора буде перепривʼязано до обраного, а цей автор — видалено.
            </span>
            <Select
              label="Автор-приймач"
              virtualized
              items={(mergeCandidates ?? []).filter((a) => a.id !== author.id)}
              getKey={(a) => a.id}
              getTextValue={(a) => a.title}
              renderItem={(a) => a.title}
              inputValue={mergeQuery}
              onInputChange={setMergeQuery}
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

export default AuthorEditModal;
