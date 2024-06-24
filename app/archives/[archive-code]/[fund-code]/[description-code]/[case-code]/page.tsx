"use client";

import {
  Badge,
  Container,
  Heading,
  ListItem,
  UnorderedList,
} from "@chakra-ui/react";
import { Prisma } from "@prisma/client";
import { NextPage } from "next";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toText } from "../../../../../utils/text";

const CasePage: NextPage = () => {
  const params = useParams();
  const archiveCode = decodeURIComponent(
    params?.["archive-code"].toString() || ""
  );
  const fundCode = decodeURIComponent(params?.["fund-code"].toString() || "");
  const descriptionCode = decodeURIComponent(
    params?.["description-code"].toString() || ""
  );
  const code = decodeURIComponent(params?.["case-code"].toString() || "");

  const [archive, setArchive] = useState<
    Prisma.CaseGetPayload<{
      select: {
        matches: {
          select: {
            id: true;
            resource: {
              select: { code: true; title: true };
            };
            archive: {
              select: { code: true };
            };
            fund: {
              select: { code: true };
            };
            description: {
              select: { code: true };
            };
            case: {
              select: { code: true };
            };
          };
        };
      };
    }>
  >();

  useEffect(() => {
    const fetchArchive = async () => {
      const response = await fetch(
        `/api/archives/${archiveCode}/${descriptionCode}/${code}`
      );
      const data = await response.json();
      setArchive(data);
    };
    fetchArchive();
  }, [archiveCode, fundCode, descriptionCode, code]);

  return (
    <>
      <Heading fontSize="xl">
        Ресурси де можна знайти справу{" "}
        {toText({
          archive: archiveCode,
          fund: fundCode,
          description: descriptionCode,
          case: code,
        })}
      </Heading>
      <UnorderedList>
        {archive?.matches?.map((match) => (
          <ListItem key={match.id} id={match.id}>
            <Badge>{match.resource.title}</Badge>
            {[
              match.archive?.code,
              match.fund?.code,
              match.description?.code,
              match.case?.code,
            ]
              .filter(Boolean)
              .join(" / ")}
          </ListItem>
        ))}
      </UnorderedList>
    </>
  );
};

export default CasePage;
