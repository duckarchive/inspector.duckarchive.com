"use client";

import { Key, useState } from "react";
import Select from "@/components/select";
import CatalogSelect from "@/components/editor/catalog-select";
import CatalogItemLink from "@/components/editor/catalog-item-link";
import { useGet } from "@/hooks/useApi";
import { useCatalogPicker } from "@/hooks/useCatalogPicker";
import { editorFilesEndpoint, editorFondsEndpoint, editorInventoriesEndpoint } from "@/hooks/useEditor";
import { GetCatalogArchivesResponse } from "@/app/api/catalog/route";
import { EditorFond } from "@/app/api/editor/catalog/fonds/data";
import { EditorInventory } from "@/app/api/editor/catalog/inventories/data";
import { EditorFile } from "@/app/api/editor/catalog/files/data";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface InstancePickerProps {
  target: OnlineCopyTarget;
  /** Emits the selected instance id (inventory id or file id), or "" when incomplete. */
  onChange: (id: string) => void;
}

const InstancePicker: React.FC<InstancePickerProps> = ({ target, onChange }) => {
  const { data: archives } = useGet<GetCatalogArchivesResponse>("/api/catalog");
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
      <CatalogSelect
        picker={fonds}
        label="Фонд"
        isDisabled={!archiveCode}
        value={fondId}
        onChange={(id) => {
          setFondId(id);
          setInventoryId("");
          setFileId("");
          onChange("");
        }}
      />
      <CatalogSelect
        picker={inventories}
        label="Опис"
        isDisabled={!fondId}
        value={inventoryId}
        onChange={(id) => {
          setInventoryId(id);
          setFileId("");
          onChange(target === "inventory" ? id : "");
        }}
      />
      {target === "file" && (
        <CatalogSelect
          picker={files}
          label="Справа"
          isDisabled={!inventoryId}
          value={fileId}
          onChange={(id) => {
            setFileId(id);
            onChange(id);
          }}
        />
      )}
      <CatalogItemLink
        codes={[
          archiveCode,
          fonds.selected?.code,
          inventories.selected?.code,
          target === "file" ? files.selected?.code : undefined,
        ]}
      />
    </div>
  );
};

export default InstancePicker;
