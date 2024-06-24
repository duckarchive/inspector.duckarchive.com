"use client";

import {
  Heading,
  Table,
  Tbody,
  Td,
  Th,
  Tr,
} from "@chakra-ui/react";
import { Prisma } from "@prisma/client";
import { NextPage } from "next";
import { Link } from "@chakra-ui/next-js";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const FundPage: NextPage = () => {
  const params = useParams();
  const archiveCode = decodeURIComponent(
    params?.["archive-code"].toString() || ""
  );
  const code = decodeURIComponent(params?.["fund-code"].toString() || "");

  const [fund, setFund] = useState<
    Prisma.FundGetPayload<{
      select: {
        id: true;
        code: true;
        title: true;
        descriptions: {
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
    const fetchFund = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${code}`);
      const data = await response.json();
      setFund(data);
    };
    fetchFund();
  }, [code, archiveCode]);

  return (
    <>
      <Heading as="h1" size="lg" mb="4">
        {fund?.title}
      </Heading>
      <Table bg="white">
        <Tbody>
          <Tr key="archives-table-header" w="full">
            <Th>Індекс</Th>
            <Th>Опис</Th>
            <Th textAlign="right">Справ онлайн</Th>
            <Th textAlign="right">Оновлено</Th>
          </Tr>
          {fund?.descriptions.map((description) => (
            <Tr key={description.id} w="full">
              <Td>{description.code}</Td>
              <Td>
                <Link href={`/archives/${archiveCode}/${code}/${description.code}`} color="blue.600">
                  {description.title || `Опис ${description.code}`}
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

export default FundPage;
