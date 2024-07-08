import {
  Card,
  CardBody,
  CardHeader,
  Heading,
  Input,
  InputGroup,
  InputLeftAddon,
  List,
  ListItem,
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
    <Card>
      <CardHeader>
        <Heading fontSize="lg" textTransform="uppercase">
          архівна справа онлайн
        </Heading>
        <Text>
          Шукай серед опублікованих онлайн сканів, на всіх доступних ресурсах одним запитом. Цей проєкт автоматично
          збирає інформацію про опубліковані справи та зберігає їх в базі даних.
        </Text>
      </CardHeader>
      <CardBody>
        <VStack>
          <Text as="label" w="full">
            Введіть реквізити у форматі
            <Input placeholder="ДАХмО Р6193-12-1" w="full" onChange={handleFormattedInputChange} />
          </Text>
          {/* <Text as="label" w="full">
            або вкажіть вручну
            <InputGroup>
              <InputLeftAddon fontSize="xs" p={2}>
                Архів
              </InputLeftAddon>
              <ArchiveSelect />
              <InputLeftAddon fontSize="xs" p={2}>
                Ф.
              </InputLeftAddon>
              <Input mr={2} />
              <InputLeftAddon fontSize="xs" p={2}>
                Оп.
              </InputLeftAddon>
              <Input mr={2} />
              <InputLeftAddon fontSize="xs" p={2}>
                Спр.
              </InputLeftAddon>
              <Input />
            </InputGroup>
          </Text> */}

          <List>
            {searchResults.map((result) => (
              <ListItem key={result.id}>
                <Link href={result.url || ""} key={result.id}>
                  {result.url}
                </Link>
              </ListItem>
            ))}
          </List>
        </VStack>
      </CardBody>
    </Card>
  );
};

export default SearchPanel;
