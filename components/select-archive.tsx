import { Autocomplete, AutocompleteItem } from "@heroui/react";
import { Archives } from "@/data/archives";
import { Key } from "react";

interface SelectArchiveProps {
  archives: Archives;
  value?: string;
  onChange: (key: Key | null) => void;
  withoutTitle?: boolean;
}

const SelectArchive: React.FC<SelectArchiveProps> = ({ archives, value, onChange, withoutTitle }) => {
  return (
    <Autocomplete
      label="Архів"
      isClearable={false}
      selectedKey={value}
      onSelectionChange={onChange}
    >
      {archives.map((archive) => (
        <AutocompleteItem key={archive.code} value={archive.code} textValue={archive.code}>
          <div>
            <p>{archive.code}</p>
            {!withoutTitle && <p className="opacity-70 text-sm text-wrap">{archive.title}</p>}
          </div>
        </AutocompleteItem>
      ))}
    </Autocomplete>
  );
};

export default SelectArchive;
