"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, Link, Modal, TextArea, TextField, toast } from "@heroui/react";
import PendingButton from "@/components/pending-button";
import StepTree from "@/components/report/step-tree";
import StepOnlineCopy from "@/components/report/step-online-copy";
import StepData from "@/components/report/step-data";
import StepGeo from "@/components/report/step-geo";
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

/** Steps 1–4 are yes/no gates; "text" is the terminal free-text step. */
const GATE_STEPS: Record<Exclude<StepId, "text">, { question: string; hint: string }> = {
  tree: { question: "step-tree-question", hint: "step-tree-hint" },
  "online-copy": { question: "step-copy-question", hint: "step-copy-hint" },
  data: { question: "step-data-question", hint: "step-data-hint" },
  geo: { question: "step-geo-question", hint: "step-geo-hint" },
};

const ReportWizard: React.FC<ReportWizardProps> = ({ entity, targetId, current, editorHref, onClose }) => {
  const t = useTranslations("report-form");
  const { trigger, isMutating } = useSubmitReport(entity);

  const steps = stepsForEntity(entity);
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState<ReportDraft>(emptyDraft);
  const [answers, setAnswers] = useState<Partial<Record<StepId, boolean>>>({});

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const answer = answers[step];

  const patch = (next: Partial<ReportDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const answerNo = () => {
    // Skipping a gate drops whatever it had collected, so Back stays truthful.
    setAnswers((prev) => ({ ...prev, [step]: false }));
    if (step === "tree") patch({ tree: undefined });
    if (step === "online-copy") patch({ onlineCopy: undefined });
    if (step === "data") patch({ data: undefined });
    if (step === "geo") patch({ geo: undefined });
    setIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const answerYes = () => setAnswers((prev) => ({ ...prev, [step]: true }));

  const sectionFilled =
    (step === "tree" && Boolean(draft.tree)) ||
    (step === "online-copy" && Boolean(draft.onlineCopy)) ||
    (step === "data" && Boolean(draft.data)) ||
    (step === "geo" && Boolean(draft.geo));

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
      <Modal.Header className="flex flex-col gap-0.5">
        <Modal.Heading>{t("title")}</Modal.Heading>
        <span className="text-xs font-normal text-muted">
          {t("progress", { current: index + 1, total: steps.length })}
        </span>
      </Modal.Header>
      <Modal.Body className="gap-3">
        {step === "text" ? (
          <>
            <p className="text-sm">{t("step-text-question")}</p>
            <TextField value={draft.text} onChange={(text) => patch({ text })}>
              <TextArea placeholder={t("text-placeholder")} rows={4} maxLength={2000} />
            </TextField>
          </>
        ) : (
          <>
            <p className="text-foreground">{t(GATE_STEPS[step as Exclude<StepId, "text">].question)}</p>
            <p className="text-xs text-muted">{t(GATE_STEPS[step as Exclude<StepId, "text">].hint)}</p>
            <div className="flex gap-2 mt-2">
              <Button className="grow" variant={answer ? "primary" : "outline"} onPress={answerYes}>
                {t("yes")}
              </Button>
              <Button className="grow" variant={answer === false ? "primary" : "outline"} onPress={answerNo}>
                {t("no")}
              </Button>
            </div>
            {answer && step === "tree" && (
              <StepTree entity={entity} current={current} value={draft.tree} onChange={(tree) => patch({ tree })} />
            )}
            {answer && step === "online-copy" && (
              <StepOnlineCopy
                current={current}
                value={draft.onlineCopy}
                onChange={(onlineCopy) => patch({ onlineCopy })}
              />
            )}
            {answer && step === "data" && (
              <StepData current={current} value={draft.data} onChange={(data) => patch({ data })} />
            )}
            {answer && step === "geo" && (
              <StepGeo current={current} value={draft.geo} onChange={(geo) => patch({ geo })} />
            )}
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        <div className="flex gap-2 mr-auto">
          {editorHref ? (
            <Link
              href={editorHref}
              target="_blank"
              rel="noopener noreferrer"
              className="button button--secondary button--sm"
            >
              {t("editor-link")}
            </Link>
          ) : null}
          {index > 0 && (
            <Button variant="tertiary" onPress={() => setIndex((i) => i - 1)}>
              {t("back")}
            </Button>
          )}
        </div>
        <Button variant="tertiary" onPress={onClose}>
          {t("cancel")}
        </Button>
        {isLast ? (
          <PendingButton onPress={handleSubmit} isPending={isMutating} isDisabled={!canSubmit}>
            {t("submit")}
          </PendingButton>
        ) : (
          <Button onPress={() => setIndex((i) => i + 1)} isDisabled={!answer || !sectionFilled}>
            {t("next")}
          </Button>
        )}
      </Modal.Footer>
    </>
  );
};

export default ReportWizard;
