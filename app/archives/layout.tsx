"use client";

import { Box, Breadcrumb, BreadcrumbItem, BreadcrumbLink, Container, HStack, Text } from "@chakra-ui/react";
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
      href: `/archives/${archiveCode}/${fundCode}/${descriptionCode}/${caseCode}`,
      text: caseCode,
    },
  ].filter(({ text }) => text);

  return (
    <Container maxW="container.xl">
      <HStack justifyContent="space-between" bg="white" p={2} borderRadius="lg" fontWeight="medium" fontSize="sm">
        <Breadcrumb>
          {breadcrumbItems.map(({ href, text }, i) => (
            <BreadcrumbItem key={href} isCurrentPage={i === breadcrumbItems.length - 1}>
              <BreadcrumbLink href={href}>{text}</BreadcrumbLink>
            </BreadcrumbItem>
          ))}
        </Breadcrumb>
        <HStack>
          <Text>Навігація</Text>
          <Text>Буде</Text>
          <Text>Тут</Text>
        </HStack>
      </HStack>
      <Box as="main" justifyContent="space-between" bg="white" p={2} my={2} borderRadius="lg" minH="calc(100vh - )">
        {children}
      </Box>
    </Container>
  );
};

export default ArchivesLayout;
