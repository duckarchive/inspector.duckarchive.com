"use client";

import { useEffect, useState } from "react";
import { Button, Checkbox, Modal, Spinner, toast } from "@heroui/react";
import PendingButton from "@/components/pending-button";
import { usePost } from "@/hooks/useApi";
import { useAutolinkPreview } from "@/hooks/useEditor";
import { PostAutolinkBody, PostAutolinkResponse } from "@/app/api/editor/online-copies/autolink/route";

interface OnlineCopyAutolinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
}

const OnlineCopyAutolinkModal: React.FC<OnlineCopyAutolinkModalProps> = ({ isOpen, onClose, onSubmitted }) => {
  const { data, isLoading, isValidating } = useAutolinkPreview(isOpen);
  const { trigger, isMutating } = usePost<PostAutolinkResponse, PostAutolinkBody>(
    "/api/editor/online-copies/autolink",
  );
  const [strict, setStrict] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setStrict(true);
    }
  }, [isOpen]);

  const isCalculating = isLoading || isValidating;
  const preview = !isCalculating && typeof data?.wide?.files === "number" ? data : null;
  const counts = preview ? (strict ? preview.strict : preview.wide) : null;
  const total = counts ? counts.files + counts.inventories : 0;

  const handleConfirm = async () => {
    try {
      const res = await trigger({ strict });
      toast.success(`Надіслано на розгляд (справ: ${res.created.files}, описів: ${res.created.inventories})`);
      onSubmitted?.();
      onClose();
    } catch (error) {
      toast.danger("Помилка", { description: (error as Error).message });
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Backdrop>
        <Modal.Container size="lg" scroll="inside">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Автоматична привʼязка</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="gap-3">
              {isCalculating ? (
                <div className="flex items-center gap-3 py-6 justify-center">
                  <Spinner size="sm" />
                  <span className="text-sm text-muted">Пошук збігів серед онлайн-копій без привʼязки…</span>
                </div>
              ) : !preview || !counts ? (
                <p className="text-sm text-danger">Не вдалося розрахувати збіги — спробуйте ще раз.</p>
              ) : (
                <>
                  <p className="text-sm">
                    Буде запропоновано <strong>{total}</strong> привʼязок ({counts.files} справ,{" "}
                    {counts.inventories} описів). Кожна створить дію «Привʼязати онлайн-копію» на розгляд
                    адміністратора.
                  </p>
                  <Checkbox isSelected={strict} onChange={setStrict}>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      Строгий режим
                    </Checkbox.Content>
                  </Checkbox>
                  <p className="text-xs text-muted">
                    Строгий режим — лише точний збіг розпізнаного коду з повним кодом справи чи опису (
                    {preview.strict.files + preview.strict.inventories}). Вимкнений — також ширші правила:
                    FamilySearch-структура, обʼєднання «том»/«частина», латинські омогліфи, маркер «(опис)»,
                    діапазони справ ({preview.wide.files + preview.wide.inventories}).
                  </p>
                </>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" onPress={onClose}>
                Скасувати
              </Button>
              <PendingButton onPress={handleConfirm} isDisabled={total === 0} isPending={isMutating}>
                Підтвердити
              </PendingButton>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
};

export default OnlineCopyAutolinkModal;
