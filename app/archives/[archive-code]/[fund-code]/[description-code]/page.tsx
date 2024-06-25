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
import { sortByCode } from "../../../../utils/table";

const DescriptionPage: NextPage = () => {
  const params = useParams();
  const archiveCode = decodeURIComponent(
    params?.["archive-code"].toString() || ""
  );
  const fundCode = decodeURIComponent(params?.["fund-code"].toString() || "");
  const code = decodeURIComponent(
    params?.["description-code"].toString() || ""
  );

  const [description, setDescription] = useState<
    Prisma.DescriptionGetPayload<{
      select: {
        id: true;
        code: true;
        title: true;
        cases: {
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
    const fetchDescription = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${fundCode}/${code}`);
      const data = await response.json();
      setDescription(data);
    };
    fetchDescription();
  }, [archiveCode, fundCode, code]);

  return (
    <>
      <Heading as="h1" size="lg" mb="4">
        {description?.title}
      </Heading>
      <Table bg="white">
        <Tbody>
          <Tr key="archives-table-header" w="full">
            <Th>Індекс</Th>
            <Th>Справа</Th>
            <Th textAlign="right">Справ онлайн</Th>
            <Th textAlign="right">Оновлено</Th>
          </Tr>
          {description?.cases.sort(sortByCode).map((caseItem) => (
            <Tr key={caseItem.id} w="full">
              <Td>{caseItem.code}</Td>
              <Td>
                <Link href={`/archives/${archiveCode}/${fundCode}/${code}/${caseItem.code}`} color="blue.600">
                  {caseItem.title || `Справа ${caseItem.code}`}
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

export default DescriptionPage;
