"use client";

import { Heading, Table, Tbody, Td, Th, Tr } from "@chakra-ui/react";
import { Prisma } from "@prisma/client";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ArchivePage: NextPage = () => {
  const params = useParams();
  const code = decodeURIComponent(params?.["archive-code"].toString() || "");

  const [archive, setArchive] = useState<
    Prisma.ArchiveGetPayload<{
      select: {
        id: true;
        code: true;
        title: true;
        funds: {
          select: {
            id: true;
            code: true;
            title: true;
          };
        };
      };
    }>
  >();

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
      <Heading as="h1" size="lg" mb="4">
        {archive?.title}
      </Heading>
      <Table bg="white">
        <Tbody>
          <Tr key="archives-table-header" w="full">
            <Th>Індекс</Th>
            <Th>Фонд</Th>
            <Th textAlign="right">Справ онлайн</Th>
            <Th textAlign="right">Оновлено</Th>
          </Tr>
          {archive?.funds.map((fund) => (
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
