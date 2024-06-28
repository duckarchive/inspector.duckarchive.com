"use client";

import {
  HStack,
  Heading,
  Image,
  Table,
  Tbody,
  Td,
  Th,
  Tr,
  VStack,
} from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { sortByCode } from "../../utils/table";
import { GetArchiveResponse } from "../../../pages/api/archives/[archive-code]";

const ArchivePage: NextPage = () => {
  const params = useParams();
  const code = decodeURIComponent(params?.["archive-code"].toString() || "");

  const [archive, setArchive] = useState<GetArchiveResponse>();

  useEffect(() => {
    const fetchArchive = async () => {
      const response = await fetch(`/api/archives/${code}`);
      const data = await response.json();
      setArchive(data);
    };
    fetchArchive();
  }, [code]);

  return (
    <>
      <HStack
        justifyContent="space-between"
        alignItems="flex-start"
        bg="white"
        mb={2}
        p={2}
        borderRadius="lg"
        minH="32"
      >
        <VStack>
          <Heading as="h1" size="lg" mb="4">
            {archive?.title}
          </Heading>
        </VStack>
        {archive?.logo_url && (
          <Image
            src={`/${archive.logo_url}`}
            alt={`Прапор ${archive?.title}`}
            maxH="32"
          />
        )}
      </HStack>
      <Table bg="white">
        <Tbody>
          <Tr key="archives-table-header" w="full">
            <Th>Індекс</Th>
            <Th>Фонд</Th>
            <Th textAlign="right">Справ онлайн</Th>
            <Th textAlign="right">Оновлено</Th>
          </Tr>
          {archive?.funds.sort(sortByCode).map((fund) => (
            <Tr key={fund.id} w="full">
              <Td>{fund.code}</Td>
              <Td>
                <Link href={`/archives/${code}/${fund.code}`} color="blue.600">
                  {fund.title}
                </Link>
              </Td>
              <Td textAlign="right">566471</Td>
              <Td textAlign="right">вчора</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ArchivePage;
