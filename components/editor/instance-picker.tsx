"use client";

import { Key, useState } from "react";
import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import SelectArchive from "@/components/select-archive";
import { editorAutocompleteVirtualization, wrapItemClassNames } from "@/components/editor/autocomplete";
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
      <SelectArchive
        archives={archives ?? []}
        value={archiveCode}
        onChange={(key: Key | null) => {
          setArchiveCode(String(key ?? ""));
          setFondId("");
          setInventoryId("");
          setFileId("");
          onChange("");
        }}
      />
      <Autocomplete
        size="sm"
        label="Фонд"
        isDisabled={!archiveCode}
        {...editorAutocompleteVirtualization}
        selectedKey={fondId || null}
        onSelectionChange={(key: Key | null) => {
          setFondId(String(key ?? ""));
          setInventoryId("");
          setFileId("");
          onChange("");
        }}
        defaultItems={fonds ?? []}
      >
        {(f) => (
          <AutocompleteItem key={f.id} textValue={`${f.code} ${f.title ?? ""}`} classNames={wrapItemClassNames}>
            {f.code} {f.title ? `— ${f.title}` : ""}
          </AutocompleteItem>
        )}
      </Autocomplete>
      <Autocomplete
        size="sm"
        label="Опис"
        isDisabled={!fondId}
        {...editorAutocompleteVirtualization}
        selectedKey={inventoryId || null}
        onSelectionChange={(key: Key | null) => {
          const id = String(key ?? "");
          setInventoryId(id);
          setFileId("");
          onChange(target === "inventory" ? id : "");
        }}
        defaultItems={inventories ?? []}
      >
        {(inv) => (
          <AutocompleteItem key={inv.id} textValue={`${inv.code} ${inv.title ?? ""}`} classNames={wrapItemClassNames}>
            {inv.code} {inv.title ? `— ${inv.title}` : ""}
          </AutocompleteItem>
        )}
      </Autocomplete>
      {target === "file" && (
        <Autocomplete
          size="sm"
          label="Справа"
          isDisabled={!inventoryId}
          {...editorAutocompleteVirtualization}
          selectedKey={fileId || null}
          onSelectionChange={(key: Key | null) => {
            const id = String(key ?? "");
            setFileId(id);
            onChange(id);
          }}
          defaultItems={files ?? []}
        >
          {(file) => (
            <AutocompleteItem key={file.id} textValue={`${file.code} ${file.title ?? ""}`} classNames={wrapItemClassNames}>
              {file.code} {file.title ? `— ${file.title}` : ""}
            </AutocompleteItem>
          )}
        </Autocomplete>
      )}
    </div>
  );
};

export default InstancePicker;
