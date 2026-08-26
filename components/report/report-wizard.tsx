"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Accordion, Button, Chip, Link, Modal, TextArea, TextField, toast } from "@heroui/react";
import { FaCheck } from "react-icons/fa";
import PendingButton from "@/components/pending-button";
import StepTree from "@/components/report/step-tree";
import StepOnlineCopy from "@/components/report/step-online-copy";
import StepData from "@/components/report/step-data";
import StepAuthors from "@/components/report/step-authors";
import StepLocation from "@/components/report/step-location";
import useSubmitReport from "@/components/report/use-submit-report";
import { ApiError } from "@/lib/api";
import { EditorEntity } from "@/lib/editor-actions";
import {
  buildReportActionBodies,
  emptyDraft,
  hasStructuredContent,
  ReportCurrentValues,
  ReportDraft,
  StepId,
  stepsForEntity,
} from "@/components/report/types";

interface ReportWizardProps {
  entity: EditorEntity;
  targetId: string;
  current: ReportCurrentValues;
  editorHref?: string;
  onClose: () => void;
}

type SectionId = Exclude<StepId, "text">;

const SECTIONS: Record<SectionId, { question: string; hint: string }> = {
  tree: { question: "step-tree-question", hint: "step-tree-hint" },
  "online-copy": { question: "step-copy-question", hint: "step-copy-hint" },
  data: { question: "step-data-question", hint: "step-data-hint" },
  authors: { question: "step-authors-question", hint: "step-authors-hint" },
  location: { question: "step-location-question", hint: "step-location-hint" },
};

/**
 * One-screen report form. Every section the entity supports is a collapsed
 * accordion item; expanding one is the opt-in (the old wizard's yes/no gate),
 * and a section left untouched emits nothing — each Step diffs against the
 * current values and yields `undefined` when unchanged. The free-text comment
 * always sits at the bottom.
 */
const ReportWizard: React.FC<ReportWizardProps> = ({ entity, targetId, current, editorHref, onClose }) => {
  const t = useTranslations("report-form");
  const { trigger, isMutating } = useSubmitReport(entity);

  const sections = stepsForEntity(entity).filter((s): s is SectionId => s !== "text");
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);

  const patch = (next: Partial<ReportDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const sectionFilled: Record<SectionId, boolean> = {
    tree: Boolean(draft.tree),
    "online-copy": Boolean(draft.onlineCopy),
    data: Boolean(draft.data),
    authors: Boolean(draft.authors?.length),
    location: Boolean(draft.locations?.length),
  };

  const canSubmit = hasStructuredContent(draft) || Boolean(draft.text.trim());

  const handleSubmit = async () => {
    // A structured draft splits into one action per field with a matching
    // action type (change_title, add_location, ...) instead of one opaque
    // "report" note — see buildReportActionBodies. Submitted sequentially
    // (not the batch endpoint, which is admin-only) since a reporter isn't.
    const bodies = buildReportActionBodies(entity, targetId, draft);

    let succeeded = 0;
    let lastError: unknown;
    for (const body of bodies) {
      try {
        await trigger(body);
        succeeded += 1;
      } catch (error) {
        lastError = error;
      }
    }

    // At least one change got recorded — good enough to report success even
    // if a sibling proposal (e.g. an identical pending edit) was rejected.
    if (succeeded > 0) {
      toast.success(t("success"));
      onClose();
      return;
    }

    const status = lastError instanceof ApiError ? lastError.status : undefined;
    if (status === 409) {
      toast.warning(t("error-already-pending"));
    } else if (status === 401 || status === 403) {
      toast.danger(t("error-unauthorized"));
    } else {
      toast.danger(t("error-generic"), {
        description: lastError instanceof Error ? lastError.message : undefined,
      });
    }
  };

  return (
    <>
      <Modal.Header>
        <Modal.Heading>{t("title")}</Modal.Heading>
      </Modal.Header>
      <Modal.Body className="gap-3">
        <Accordion allowsMultipleExpanded>
          {sections.map((section) => (
            <Accordion.Item key={section} id={section}>
              <Accordion.Heading>
                <Accordion.Trigger className="px-0 items-center">
                  <span className="flex flex-col items-start gap-0.5 text-left">
                    <span className="flex items-center gap-2">
                      {t(SECTIONS[section].question)}
                      {sectionFilled[section] && (
                        <Chip size="sm" color="success" variant="soft">
                          <FaCheck />
                        </Chip>
                      )}
                    </span>
                    <span className="text-xs font-normal text-muted">{t(SECTIONS[section].hint)}</span>
                  </span>
                  <Accordion.Indicator />
                </Accordion.Trigger>
              </Accordion.Heading>
              <Accordion.Panel>
                <Accordion.Body className="px-0 pb-4">
                  {section === "tree" && (
                    <StepTree entity={entity} current={current} value={draft.tree} onChange={(tree) => patch({ tree })} />
                  )}
                  {section === "online-copy" && (
                    <StepOnlineCopy
                      current={current}
                      value={draft.onlineCopy}
                      onChange={(onlineCopy) => patch({ onlineCopy })}
                    />
                  )}
                  {section === "data" && (
                    <StepData current={current} value={draft.data} onChange={(data) => patch({ data })} />
                  )}
                  {section === "authors" && (
                    <StepAuthors current={current} value={draft.authors} onChange={(authors) => patch({ authors })} />
                  )}
                  {section === "location" && (
                    <StepLocation current={current} value={draft.locations} onChange={(locations) => patch({ locations })} />
                  )}
                </Accordion.Body>
              </Accordion.Panel>
            </Accordion.Item>
          ))}
        </Accordion>
        <div className="flex flex-col gap-1">
          <p className="text-sm">{t("step-text-question")}</p>
          <TextField value={draft.text} onChange={(text) => patch({ text })}>
            <TextArea placeholder={t("text-placeholder")} rows={3} maxLength={2000} />
          </TextField>
        </div>
      </Modal.Body>
      <Modal.Footer>
        {editorHref ? (
          <Link
            href={editorHref}
            target="_blank"
            rel="noopener noreferrer"
            className="button button--secondary button--sm mr-auto"
          >
            {t("editor-link")}
          </Link>
        ) : null}
        <Button variant="tertiary" onPress={onClose}>
          {t("cancel")}
        </Button>
        <PendingButton onPress={handleSubmit} isPending={isMutating} isDisabled={!canSubmit}>
          {t("submit")}
        </PendingButton>
      </Modal.Footer>
    </>
  );
};

export default ReportWizard;
