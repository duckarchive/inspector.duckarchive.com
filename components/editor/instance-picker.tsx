"use client";

import { Key, useState } from "react";
import Select from "@/components/select";
import { useGet } from "@/hooks/useApi";
import { useCatalogPicker } from "@/hooks/useCatalogPicker";
import { editorFilesEndpoint, editorFondsEndpoint, editorInventoriesEndpoint } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface InstancePickerProps {
  target: OnlineCopyTarget;
  /** Emits the selected instance id (inventory id or file id), or "" when incomplete. */
  onChange: (id: string) => void;
}

/** Code over title, matching how archivists read a reference. */
const codeAndTitle = (item: { code: string; title?: string | null }) => `${item.code} ${item.title ?? ""}`.trim();

const codeAndTitleOption = (item: { code: string; title?: string | null }) => (
  <div>
    <p>{item.code}</p>
    <p className="opacity-70 text-sm text-wrap">{item.title}</p>
  </div>
);

const InstancePicker: React.FC<InstancePickerProps> = ({ target, onChange }) => {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState("");
  const [fondId, setFondId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const [fileId, setFileId] = useState("");

  const fonds = useCatalogPicker<EditorFond>(editorFondsEndpoint(archiveCode), fondId);
  const inventories = useCatalogPicker<EditorInventory>(editorInventoriesEndpoint(fondId), inventoryId);
  const files = useCatalogPicker<EditorFile>(
    editorFilesEndpoint(target === "file" ? inventoryId : ""),
    fileId,
  );

  return (
    <div className="flex flex-col gap-3">
      <Select
        items={(archives ?? []).sort((a, b) => a.code.localeCompare(b.code))}
        label="Архів"
        getKey={(a) => a.code}
        getTextValue={(a) => a.code}
        renderItem={(a) => (
          <div>
            <p>{a.code}</p>
            <p className="opacity-70 text-sm text-wrap">{a.title}</p>
          </div>
        )}
        value={archiveCode}
        onChange={(key: Key | null) => {
          setArchiveCode(String(key ?? ""));
          setFondId("");
          setInventoryId("");
          setFileId("");
          onChange("");
        }}
      />
      <Select
        label="Фонд"
        virtualized
        isDisabled={!archiveCode}
        getKey={(f) => f.id}
        getTextValue={codeAndTitle}
        renderItem={codeAndTitleOption}
        value={fondId}
        onChange={(key: Key | null) => {
          setFondId(String(key ?? ""));
          setInventoryId("");
          setFileId("");
          onChange("");
        }}
        {...fonds.selectProps}
      />
      <Select
        label="Опис"
        virtualized
        isDisabled={!fondId}
        getKey={(inv) => inv.id}
        getTextValue={codeAndTitle}
        renderItem={codeAndTitleOption}
        value={inventoryId}
        onChange={(key: Key | null) => {
          const id = String(key ?? "");
          setInventoryId(id);
          setFileId("");
          onChange(target === "inventory" ? id : "");
        }}
        {...inventories.selectProps}
      />
      {target === "file" && (
        <Select
          label="Справа"
          virtualized
          isDisabled={!inventoryId}
          getKey={(file) => file.id}
          getTextValue={codeAndTitle}
          renderItem={codeAndTitleOption}
          value={fileId}
          onChange={(key: Key | null) => {
            const id = String(key ?? "");
            setFileId(id);
            onChange(id);
          }}
          {...files.selectProps}
        />
      )}
    </div>
  );
};

export default InstancePicker;
