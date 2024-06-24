"use client";

import { Badge, Container, Heading, ListItem, UnorderedList } from "@chakra-ui/react";
import { Prisma } from "@prisma/client";
import { NextPage } from "next";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

const ArchivePage: NextPage = () => {
  const params = useParams();
  const [archive, setArchive] = useState<
    Prisma.ArchiveGetPayload<{
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
            }
          }
        }};
    }>
  >();

  useEffect(() => {
    const fetchArchive = async () => {
      const response = await fetch(`/api/archives/${params?.id}`);
      const data = await response.json();
      setArchive(data);
    };
    fetchArchive();
  }, [params?.id]);

  return <Container>
    <Heading fontSize="xl">
      Список синхронізацій по даному архіву
    </Heading>
    <UnorderedList>
      {archive?.matches?.map((match) => 
        <ListItem key={match.id} id={match.id}>
          <Badge>{match.resource.title}</Badge>
          {[match.archive?.code, match.fund?.code, match.description?.code, match.case?.code].filter(Boolean).join(" / ")}
        </ListItem>
      )}
    </UnorderedList>
  </Container>;
};

export default ArchivePage;
