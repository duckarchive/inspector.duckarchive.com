"use client";

import { Key, useState } from "react";
import Select from "@/components/select";
import { useGet } from "@/hooks/useApi";
import { useEditorFiles, useEditorFonds, useEditorInventories } from "@/hooks/useEditor";
import { GetArchivesResponse } from "@/app/api/archives/route";
import { OnlineCopyTarget } from "@/app/api/editor/online-copies/data";

interface InstancePickerProps {
  target: OnlineCopyTarget;
  /** Emits the selected instance id (inventory id or file id), or "" when incomplete. */
  onChange: (id: string) => void;
}

const InstancePicker: React.FC<InstancePickerProps> = ({ target, onChange }) => {
  const { data: archives } = useGet<GetArchivesResponse>("/api/archives");
  const [archiveCode, setArchiveCode] = useState("");
  const [fondId, setFondId] = useState("");
  const [inventoryId, setInventoryId] = useState("");
  const [fileId, setFileId] = useState("");

  const { data: fonds } = useEditorFonds(archiveCode || undefined);
  const { data: inventories } = useEditorInventories(fondId || undefined);
  const { data: files } = useEditorFiles(target === "file" ? inventoryId || undefined : undefined);

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
        items={fonds ?? []}
        label="Фонд"
        virtualized
        isDisabled={!archiveCode}
        getKey={(f) => f.id}
        getTextValue={(f) => `${f.code} ${f.title ?? ""}`}
        renderItem={(f) => (
          <div>
            <p>{f.code}</p>
            <p className="opacity-70 text-sm text-wrap">{f.title}</p>
          </div>
        )}
        value={fondId}
        onChange={(key: Key | null) => {
          setFondId(String(key ?? ""));
          setInventoryId("");
          setFileId("");
          onChange("");
        }}
      />
      <Select
        items={inventories ?? []}
        label="Опис"
        virtualized
        isDisabled={!fondId}
        getKey={(inv) => inv.id}
        getTextValue={(inv) => `${inv.code} ${inv.title ?? ""}`}
        renderItem={(inv) => (
          <div>
            <p>{inv.code}</p>
            <p className="opacity-70 text-sm text-wrap">{inv.title}</p>
          </div>
        )}
        value={inventoryId}
        onChange={(key: Key | null) => {
          const id = String(key ?? "");
          setInventoryId(id);
          setFileId("");
          onChange(target === "inventory" ? id : "");
        }}
      />
      {target === "file" && (
        <Select
          items={files ?? []}
          label="Справа"
          virtualized
          isDisabled={!inventoryId}
          getKey={(file) => file.id}
          getTextValue={(file) => `${file.code} ${file.title ?? ""}`}
          renderItem={(file) => (
            <div>
              <p>{file.code}</p>
              <p className="opacity-70 text-sm text-wrap">{file.title}</p>
            </div>
          )}
          value={fileId}
          onChange={(key: Key | null) => {
            const id = String(key ?? "");
            setFileId(id);
            onChange(id);
          }}
        />
      )}
    </div>
  );
};

export default InstancePicker;
