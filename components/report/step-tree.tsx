"use client";

import { Key, useState } from "react";
import { useTranslations } from "next-intl";
import { Input, TextField } from "@heroui/react";
import Select from "@/components/select";
import { useGet } from "@/hooks/useApi";
import { EditorEntity, ReportNotePayload } from "@/lib/editor-actions";
import { catalogItemLabel } from "@/lib/catalog-links";
import { GetCatalogArchivesResponse } from "@/app/api/catalog/route";
import { GetCatalogArchiveResponse } from "@/app/api/catalog/[archive-code]/route";
import { GetFondResponse } from "@/app/api/catalog/[archive-code]/[fond-code]/route";
import { ReportCurrentValues } from "@/components/report/types";

interface StepTreeProps {
  entity: EditorEntity;
  current: ReportCurrentValues;
  value?: ReportNotePayload["tree"];
  onChange: (value: ReportNotePayload["tree"] | undefined) => void;
}

/**
 * Proposes a new parent and/or a new own code for the record. Reads the public
 * catalog endpoints, which return a whole level at a time — so the selects
 * filter client-side.
 */
const StepTree: React.FC<StepTreeProps> = ({ entity, current, value, onChange }) => {
  const t = useTranslations("report-form");
  const [archiveCode, setArchiveCode] = useState(value?.archive?.code ?? current.codes.archive);
  const [fondCode, setFondCode] = useState(value?.fond?.code ?? (value ? "" : (current.codes.fond ?? "")));
  const [inventoryCode, setInventoryCode] = useState(
    value?.inventory?.code ?? (value ? "" : (current.codes.inventory ?? "")),
  );

  const needsFond = entity !== "fond";
  const needsInventory = entity === "file";

  // the record's own code (the last segment of the full code)
  const currentOwnCode =
    (entity === "fond" ? current.codes.fond : entity === "inventory" ? current.codes.inventory : current.codes.file) ?? "";
  const [ownCode, setOwnCode] = useState(value?.code ?? currentOwnCode);

  const { data: archives, isLoading: isLoadingArchives } = useGet<GetCatalogArchivesResponse>("/api/catalog");
  const { data: archive, isLoading: isLoadingFonds } = useGet<GetCatalogArchiveResponse>(
    needsFond && archiveCode ? `/api/catalog/${encodeURIComponent(archiveCode)}` : null,
  );
  const { data: fond, isLoading: isLoadingInventories } = useGet<GetFondResponse>(
    needsInventory && archiveCode && fondCode
      ? `/api/catalog/${encodeURIComponent(archiveCode)}/${encodeURIComponent(fondCode)}`
      : null,
  );

  const currentParent = catalogItemLabel([
    current.codes.archive,
    needsFond ? current.codes.fond : undefined,
    needsInventory ? current.codes.inventory : undefined,
  ]);
  const currentFull = catalogItemLabel([
    current.codes.archive,
    ...(needsFond ? [current.codes.fond] : []),
    ...(needsInventory ? [current.codes.inventory] : []),
    currentOwnCode || undefined,
  ]);

  const emit = (next: { archiveCode: string; fondCode: string; inventoryCode: string; ownCode: string }) => {
    const nextParent = catalogItemLabel([
      next.archiveCode,
      needsFond ? next.fondCode : undefined,
      needsInventory ? next.inventoryCode : undefined,
    ]);
    // A parent proposal counts only once the chain is complete and actually different.
    const isComplete =
      Boolean(next.archiveCode) && (!needsFond || Boolean(next.fondCode)) && (!needsInventory || Boolean(next.inventoryCode));
    const parentChanged = isComplete && nextParent !== currentParent;
    const nextOwnCode = next.ownCode.trim();
    const codeChanged = Boolean(nextOwnCode) && nextOwnCode !== currentOwnCode;

    if (!parentChanged && !codeChanged) {
      onChange(undefined);
      return;
    }

    const archiveMatch = archives?.find((a) => a.code === next.archiveCode);
    const fondMatch = archive?.fonds.find((f) => f.code === next.fondCode);
    const inventoryMatch = fond?.inventories.find((i) => i.code === next.inventoryCode);

    onChange({
      ...(parentChanged
        ? {
            archive: { id: archiveMatch?.id, code: next.archiveCode, title: archiveMatch?.title ?? undefined },
            ...(needsFond
              ? { fond: { id: fondMatch?.id, code: next.fondCode, title: fondMatch?.title ?? undefined } }
              : {}),
            ...(needsInventory
              ? { inventory: { id: inventoryMatch?.id, code: next.inventoryCode, title: inventoryMatch?.title ?? undefined } }
              : {}),
          }
        : {}),
      ...(codeChanged ? { code: nextOwnCode } : {}),
    });
  };

  const selectArchive = (key: Key | null) => {
    const code = String(key ?? "");
    setArchiveCode(code);
    setFondCode("");
    setInventoryCode("");
    emit({ archiveCode: code, fondCode: "", inventoryCode: "", ownCode });
  };

  const selectFond = (key: Key | null) => {
    const code = String(key ?? "");
    setFondCode(code);
    setInventoryCode("");
    emit({ archiveCode, fondCode: code, inventoryCode: "", ownCode });
  };

  const changeOwnCode = (code: string) => {
    setOwnCode(code);
    emit({ archiveCode, fondCode, inventoryCode, ownCode: code });
  };

  const selectInventory = (key: Key | null) => {
    const code = String(key ?? "");
    setInventoryCode(code);
    emit({ archiveCode, fondCode, inventoryCode: code, ownCode });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {t("tree-current-label")}: <span className="text-foreground font-mono">{currentFull}</span>
      </p>
      <Select
        label={t("tree-archive-label")}
        virtualized
        isDisabled={isLoadingArchives}
        items={archives ?? []}
        getKey={(a) => a.code}
        getTextValue={(a) => `${a.code}${a.title ? ` — ${a.title}` : ""}`}
        renderItem={(a) => `${a.code}${a.title ? ` — ${a.title}` : ""}`}
        value={archiveCode}
        onChange={selectArchive}
      />
      {needsFond && (
        <Select
          label={t("tree-fond-label")}
          virtualized
          isDisabled={!archiveCode || isLoadingFonds}
          items={archive?.fonds ?? []}
          getKey={(f) => f.code}
          getTextValue={(f) => `${f.code}${f.title ? ` — ${f.title}` : ""}`}
          renderItem={(f) => `${f.code}${f.title ? ` — ${f.title}` : ""}`}
          value={fondCode}
          onChange={selectFond}
        />
      )}
      {needsInventory && (
        <Select
          label={t("tree-inventory-label")}
          virtualized
          isDisabled={!fondCode || isLoadingInventories}
          items={fond?.inventories ?? []}
          getKey={(i) => i.code}
          getTextValue={(i) => `${i.code}${i.title ? ` — ${i.title}` : ""}`}
          renderItem={(i) => `${i.code}${i.title ? ` — ${i.title}` : ""}`}
          value={inventoryCode}
          onChange={selectInventory}
        />
      )}
      <TextField value={ownCode} onChange={changeOwnCode}>
        <Input placeholder={t("tree-code-label")} maxLength={40} />
      </TextField>
      {!value && <p className="text-xs text-muted">{t("tree-unchanged-hint")}</p>}
    </div>
  );
};

export default StepTree;
