"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container } from "@chakra-ui/react";
import { PropsWithChildren } from "react";
import useCyrillicParams from "../hooks/useCyrillicParams";
import { IoChevronForward } from "react-icons/io5";

const ArchivesLayout: React.FC<PropsWithChildren> = ({ children }) => {
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const caseCode = params["case-code"];

  const breadcrumbItems = [
    {
      href: "/archives",
      text: "Архіви",
    },
    {
      href: `/archives/${archiveCode}`,
      text: archiveCode,
    },
    {
      href: `/archives/${archiveCode}/${fundCode}`,
      text: fundCode,
    },
    {
      href: `/archives/${archiveCode}/${fundCode}/${descriptionCode}`,
      text: descriptionCode,
    },
    {
      href: `/archives/${archiveCode}/${fundCode}/${caseCode}`,
      text: caseCode,
    },
  ].filter(({ text }) => text);

  console.log(breadcrumbItems);

  return (
    <Container maxW="container.xl" py={10}>
      <Breadcrumb separator={<IoChevronForward />} fontWeight='medium' fontSize='sm'>
      {
        breadcrumbItems.map(({ href, text }, i) => (
          <BreadcrumbItem key={text} isCurrentPage={i === breadcrumbItems.length - 1}>
            <BreadcrumbLink href={href}>
              {text}
            </BreadcrumbLink>
          </BreadcrumbItem>
        ))
      }
      </Breadcrumb>
      {children}
    </Container>
  );
};

export default ArchivesLayout;
