"use client";

import { Badge, Heading, ListItem, UnorderedList } from "@chakra-ui/react";
import { NextPage } from "next";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toText } from "../../../../../utils/text";
import { GetCaseResponse } from "../../../../../../pages/api/archives/[archive-code]/[fund-code]/[description-code]/[case-code]";
import { Link } from "@chakra-ui/next-js";

const CasePage: NextPage = () => {
  const params = useParams();
  const archiveCode = decodeURIComponent(params?.["archive-code"].toString() || "");
  const fundCode = decodeURIComponent(params?.["fund-code"].toString() || "");
  const descriptionCode = decodeURIComponent(params?.["description-code"].toString() || "");
  const code = decodeURIComponent(params?.["case-code"].toString() || "");

  const [caseItem, setCaseItem] = useState<GetCaseResponse>();

  useEffect(() => {
    const fetchCase = async () => {
      const response = await fetch(`/api/archives/${archiveCode}/${fundCode}/${descriptionCode}/${code}`);
      const data = await response.json();
      setCaseItem(data);
    };
    fetchCase();
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
        {caseItem?.matches?.map((match) => (
          <ListItem key={match.id} id={match.id}>
            <Link href={match.api_url} target="_blank">
              <Badge>{match.resource.type}</Badge>
            </Link>
          </ListItem>
        ))}
      </UnorderedList>
    </>
  );
};

export default CasePage;
