import { Grid, Input, Stack, Text, VStack } from "@chakra-ui/react";
import { ChangeEvent } from "react";
import ArchiveSelect from "./Fields/ArchiveSelect";
import { SearchRequest } from "../../pages/api/search";
import { Link } from "@chakra-ui/next-js";

interface SearchPanelProps {
  values?: SearchRequest;
  onChange: (values: SearchRequest) => void;
}

const SearchPanel: React.FC<SearchPanelProps> = ({ values, onChange }) => {
  const handleArchiveChange = (archiveCode?: string) => {
    onChange({ ...values, archiveCode });
  };

  const handleFundChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, fundCode: e.target.value || undefined });
  };

  const handleDescriptionChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, descriptionCode: e.target.value || undefined });
  };

  const handleCaseChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange({ ...values, caseCode: e.target.value || undefined });
  };

  return (
    <VStack minW="xs" maxW="md">
      <Text fontSize="sm">
        Введіть шифр справи, щоб знайти посилання на онлайн версію. Для перегляду архівів цілком, використовуйте{" "}
        <Link href="/archives" color="blue.500">
          сторінку архівів.
        </Link>
      </Text>
      <Grid templateColumns="2fr repeat(3, 1fr)" gap={2} position="relative" mt={4}>
        <Stack gap={0}>
          <Text as="label" textTransform="uppercase" fontSize="xs" color="gray.500">
            архів
          </Text>
          <ArchiveSelect onChange={handleArchiveChange} />
        </Stack>
        <Stack gap={0}>
          <Text as="label" textTransform="uppercase" fontSize="xs" color="gray.500">
            фонд
          </Text>
          <Input value={values?.fundCode} onChange={handleFundChange} />
        </Stack>
        <Stack gap={0}>
          <Text as="label" textTransform="uppercase" fontSize="xs" color="gray.500">
            опис
          </Text>
          <Input value={values?.descriptionCode} onChange={handleDescriptionChange} />
        </Stack>
        <Stack gap={0}>
          <Text as="label" textTransform="uppercase" fontSize="xs" color="gray.500">
            справа
          </Text>
          <Input value={values?.caseCode} onChange={handleCaseChange} />
        </Stack>
      </Grid>
      {/* <Input placeholder="ДАХмО Р6193-12-1" onChange={handleFormattedInputChange} size="lg" w="full" readOnly /> */}
    </VStack>
  );
};

export default SearchPanel;
