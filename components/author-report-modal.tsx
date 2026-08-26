"use client";

import { useEffect, useState } from "react";
import { Button, Chip, CloseButton, Input, Modal, TextArea, TextField, toast } from "@heroui/react";
import CoordinatesInput from "@/components/coordinates-input";
import PendingButton from "@/components/pending-button";
import useSubmitAction from "@/hooks/useSubmitAction";
import { encodeNote, SubmitActionBody } from "@/lib/editor-actions";
import { PublicAuthor } from "@/app/api/authors/data";

interface AuthorReportModalProps {
  author: PublicAuthor | null;
  isOpen: boolean;
  onClose: () => void;
}

const sameNum = (a: number | null, b: number | null) => (a ?? null) === (b ?? null);

/**
 * Public counterpart of the editor's author modal: same fields and the same
 * change_author_* actions, minus the admin-only merge and delete. Nothing is
 * applied on submit — every action waits in the review queue.
 */
const AuthorReportModal: React.FC<AuthorReportModalProps> = ({ author, isOpen, onClose }) => {
  // Author edits are stored in file_actions; anchoring to a linked file makes
  // the (type, file_id) partial unique index apply per-file instead of globally.
  const { submitMany, isMutating } = useSubmitAction("file");

  const [title, setTitle] = useState("");
  const [info, setInfo] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [coords, setCoords] = useState<{ lat?: string; lng?: string; radius_m?: number }>({});

  useEffect(() => {
    if (author) {
      setTitle(author.title);
      setInfo(author.info ?? "");
      setTags(author.tags);
      setTagDraft("");
      setCoords({
        lat: author.lat != null ? String(author.lat) : undefined,
        lng: author.lng != null ? String(author.lng) : undefined,
      });
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
    const base = { target_id: author.file_authors[0]?.file_id ?? null };

    if (title !== author.title) {
      bodies.push({
        ...base,
        type: "change_author_title",
        note: encodeNote({ v: 1, author_id: author.id, field: "title", value: title }),
      });
    }
    if (info !== (author.info ?? "")) {
      bodies.push({
        ...base,
        type: "change_author_info",
        note: encodeNote({ v: 1, author_id: author.id, field: "info", value: info }),
      });
    }
    if (JSON.stringify(tags) !== JSON.stringify(author.tags)) {
      bodies.push({
        ...base,
        type: "change_author_tags",
        note: encodeNote({ v: 1, author_id: author.id, field: "tags", value: tags }),
      });
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
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Виправити автора</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="flex flex-col gap-3">
              <TextField value={title} onChange={setTitle}>
                <Input placeholder="Назва" />
              </TextField>
              <TextField value={info} onChange={setInfo}>
                <TextArea placeholder="Опис" rows={2} />
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
                    <Input placeholder="Новий тег" />
                  </TextField>
                  <Button size="sm" onPress={addTag} isDisabled={!tagDraft.trim()}>
                    Додати
                  </Button>
                </div>
              </div>

              <CoordinatesInput value={coords} onChange={setCoords} />
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

export default AuthorReportModal;
