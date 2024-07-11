import {
  Card,
  CardBody,
  CardHeader,
  Grid,
  GridItem,
  Heading,
  HStack,
  Input,
  InputGroup,
  InputLeftAddon,
  List,
  ListItem,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ChangeEvent, useState } from "react";
import { parseSearchQuery } from "../utils/parser";
import ArchiveSelect from "./Fields/ArchiveSelect";
import { Match } from "@prisma/client";
import { Link } from "@chakra-ui/next-js";

const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Match[]>([]);

  const handleFormattedInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    const parsed = parseSearchQuery(value);

    console.log(parsed);

    const fetchArchives = async () => {
      const response = await fetch("/api/search", {
        method: "POST",
        body: JSON.stringify(parsed),
        headers: {
          "Content-Type": "application/json",
        },
      });
      const data = await response.json();
      setSearchResults(data);
    };

    fetchArchives();
  };

  return (
    <VStack flexBasis="400px">
      <SimpleGrid columns={4} spacing={2}>
        <Stack gap={0}>
          <Text as="label" textAlign="center" textTransform="uppercase" fontSize="xs" color="gray.500">
            архів
          </Text>
          <ArchiveSelect />
        </Stack>
        <Stack gap={0}>
          <Text as="label" textAlign="center" textTransform="uppercase" fontSize="xs" color="gray.500">
            фонд
          </Text>
          <Input />
        </Stack>
        <Stack gap={0}>
          <Text as="label" textAlign="center" textTransform="uppercase" fontSize="xs" color="gray.500">
            опис
          </Text>
          <Input />
        </Stack>
        <Stack gap={0}>
          <Text as="label" textAlign="center" textTransform="uppercase" fontSize="xs" color="gray.500">
            справа
          </Text>
          <Input />
        </Stack>
      </SimpleGrid>
      <Input placeholder="ДАХмО Р6193-12-1" onChange={handleFormattedInputChange} size="lg" w="full" readOnly />
    </VStack>
  );
};

export default SearchPanel;
