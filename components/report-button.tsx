"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Button, Modal } from "@heroui/react";
import { FaBug } from "react-icons/fa";
import { EditorEntity } from "@/lib/editor-actions";
import ReportWizard from "@/components/report/report-wizard";
import { ReportCurrentValues } from "@/components/report/types";

interface ReportButtonProps {
  entity: EditorEntity;
  targetId?: string;
  current: ReportCurrentValues;
  editorHref?: string;
}

const ReportButton: React.FC<ReportButtonProps> = ({ entity, targetId, current, editorHref }) => {
  const t = useTranslations("report-form");
  const { status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (status !== "authenticated") {
    return null;
  }

  const close = () => setIsOpen(false);

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        isIconOnly
        aria-label={t("trigger-button")}
        isDisabled={!targetId}
        onPress={() => setIsOpen(true)}
      >
        <FaBug />
      </Button>
      <Modal isOpen={isOpen} onOpenChange={(open) => !open && close()}>
        <Modal.Backdrop>
          <Modal.Container size="lg" scroll="inside">
            <Modal.Dialog>
              <Modal.CloseTrigger />
              {/* Remounting on open resets the step stack and draft. */}
              {targetId ? (
                <ReportWizard
                  key={isOpen ? "open" : "closed"}
                  entity={entity}
                  targetId={targetId}
                  current={current}
                  editorHref={editorHref}
                  onClose={close}
                />
              ) : null}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
};

export default ReportButton;
