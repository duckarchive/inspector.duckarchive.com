"use client";

import { useEffect, useState } from "react";
import { Archive } from "@prisma/client";
import { Heading, Table, Tbody, Td, Th, Tr } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";

const ArchivesPage: NextPage = () => {
  const [archives, setArchives] = useState<Archive[]>([]);

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
            <Th textAlign="right">Остання зміна</Th>
          </Tr>
          {archives.map((archive) => (
            <Tr key={archive.id} w="full">
              <Td>{archive.code}</Td>
              <Td>
                <Link href={`archives/${archive.code}`} color="blue.600">
                  {archive.title}
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

export default ArchivesPage;
