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
      defaultOptions={ARCHIVES}
    />
  );
};

export default ArchiveSelect;
