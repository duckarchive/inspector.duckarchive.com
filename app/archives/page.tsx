"use client";

import { useEffect, useState } from "react";
import { Heading, Table, Tbody, Td, Text, Th, Tr } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import { sortByDate } from "../utils/table";

const ArchivesPage: NextPage = () => {
  const [archives, setArchives] = useState<GetAllArchivesResponse>([]);

  useEffect(() => {
    const fetchArchives = async () => {
      const response = await fetch("/api/archives");
      const data = await response.json();
      setArchives(data);
    };

    fetchArchives();
  }, []);

  return (
    <>
      <Heading as="h1" size="lg" mb="4">
        Архіви
      </Heading>
      <Table bg="white">
        <Tbody>
          <Tr key="archives-table-header" w="full">
            <Th>Індекс</Th>
            <Th>Назва</Th>
            <Th textAlign="right">Справ онлайн</Th>
            <Th textAlign="right">Оновлено</Th>
          </Tr>
          {archives.sort(sortByDate).map((archive) => (
            <Tr key={archive.id} w="full">
              <Td>{archive.code}</Td>
              <Td>
                <Link href={`archives/${archive.code}`} color="blue.600">
                  {archive.title}
                </Link>
              </Td>
              <Td textAlign="right">{archive.count}</Td>
              <Td textAlign="right">
                {
                  (archive.updated_at || archive.created_at)
                    .toString()
                    .split("T")[0]
                }
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </>
  );
};

export default ArchivesPage;
