import { Select } from "chakra-react-select";
import { useEffect, useState } from "react";
import { GetArchivesOptionsResponse } from "../../../pages/api/archives/options";
import { Box, Text } from "@chakra-ui/react";

const ArchiveSelect: React.FC = () => {
  const [archives, setArchives] = useState<GetArchivesOptionsResponse>();

  useEffect(() => {
    const fetchArchiveOptions = async () => {
      const response = await fetch(`/api/archives/options`);
      const data = await response.json();
      setArchives(data);
    };
    fetchArchiveOptions();
  }, []);

  console.log(archives);

  return (
    <Select<SelectItem>
      placeholder=""
      options={archives}
      formatOptionLabel={(option, { context }) => {
        if (context === "value") return <Text>{option.value}</Text>;
        return (
          <Box>
            <Text>{option.value}</Text>
            <Text fontSize="xs" opacity={0.7}>
              {option.label}
            </Text>
          </Box>
        );
      }}
      chakraStyles={{
        container: (provided) => ({
          ...provided,
          position: "unset",
        }),
        valueContainer: (provided) => ({
          ...provided,
          ariaLabel: "value-container",
        }),
        inputContainer: (provided) => ({
          ...provided,
          display: "flex",
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
        menu: (provided) => ({
          ...provided,
          zIndex: 100,
        }),
        menuList: (provided) => ({
          ...provided,
          zIndex: 100,
          py: 0,
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
