import { AsyncSelect } from "chakra-react-select";

const ARCHIVES: SelectItem[] = [
  {
    label: "ДАХмО",
    value: "ДАХмО",
  },
  {
    label: "ЦДІАК",
    value: "ЦДІАК",
  },
];

const ArchiveSelect: React.FC = () => {
  return (
    <AsyncSelect<SelectItem>
      placeholder=""
      defaultOptions={ARCHIVES}
      chakraStyles={{
        inputContainer: (provided) => ({
          ...provided,
          display: 'flex',
        }),
        input: (provided) => ({
          ...provided,
        }),
        placeholder: (provided) => ({
          ...provided,
        }),
        singleValue: (provided) => ({
          ...provided,
        }),
        menuList: (provided) => ({
          ...provided,
          zIndex: 100,
        }),
        menu: (provided) => ({
          ...provided,
          zIndex: 100,
        }),
      }}
      components={{
        DropdownIndicator: () => null,
        IndicatorSeparator: () => null,
        LoadingIndicator: () => null,
        IndicatorsContainer: () => null,
      }}
    />
  );
};

export default ArchiveSelect;
