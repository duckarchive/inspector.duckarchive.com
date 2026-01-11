import { Autocomplete, AutocompleteItem } from "@heroui/autocomplete";
import { Archives } from "@/data/archives";
import { Key } from "react";

interface SelectArchiveProps {
  archives: Archives;
  value?: string;
  onChange: (key: Key | null) => void;
  withoutTitle?: boolean;
  className?: string;
  id?: string;
  form?: string;
}

const SelectArchive: React.FC<SelectArchiveProps> = ({
  id,
  archives,
  value,
  onChange,
  withoutTitle,
  className,
  form,
}) => {
  return (
    <Autocomplete
      id={id}
      size="sm"
      label="Архів"
      isClearable={false}
      selectedKey={value}
      onSelectionChange={onChange}
      className={className}
      inputProps={{ form }}
    >
      {archives.map((archive) => (
        <AutocompleteItem key={archive.code} textValue={archive.code}>
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
