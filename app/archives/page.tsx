"use client";

import { useEffect, useState } from "react";
import { Button, Heading, Table, Tbody, Td, Th, Tr } from "@chakra-ui/react";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { GetAllArchivesResponse } from "../../pages/api/archives";
import { sortByDate } from "../utils/table";
import { IoRefresh } from "react-icons/io5";

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

  const handleSyncArchiveClick = (archiveId: string) => async () => {
    const response = await fetch(`/api/sync/archium/${archiveId}`);
    const data = await response.json();
    setArchives((prev) =>
      prev.map((archive) =>
        archive.id === archiveId ? { ...archive, ...data } : archive
      )
    );
  };

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
              <Td textAlign="right">
                <Button
                  size="sm"
                  variant="ghost"
                  rightIcon={<IoRefresh />}
                  fontSize="sm"
                  onClick={handleSyncArchiveClick(archive.id)}
                >
                  {archive.count}
                </Button>
              </Td>
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
