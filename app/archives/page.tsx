"use client";

import { useEffect, useState } from "react";
import { Archive } from "@prisma/client";
import { Table, Td, Th, Tr } from "@chakra-ui/react";
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
    <Table bg="white">
      <Tr key="archives-table-header" w="full">
        <Th>Назва</Th>
        <Th textAlign="right">Доступно онлайн</Th>
        <Th textAlign="right">Остання зміна</Th>
      </Tr>
      {archives.map((archive) => (
        <Tr key={archive.id} w="full">
          <Td>
            <Link href={`archives/${archive.code}`} color="blue.600">
              {archive.title}
            </Link>
          </Td>
          <Td textAlign="right">566471</Td>
          <Td textAlign="right">вчора</Td>
        </Tr>
      ))}
    </Table>
  );
};

export default ArchivesPage;
