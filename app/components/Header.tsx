"use client";

import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, HStack, Text } from "@chakra-ui/react";
import useCyrillicParams from "../hooks/useCyrillicParams";
import { usePathname } from "next/navigation";
import { Link } from "@chakra-ui/next-js";
import { IoHome } from "react-icons/io5";

const Header: React.FC = () => {
  const pathname = usePathname();
  const params = useCyrillicParams();
  const archiveCode = params["archive-code"];
  const fundCode = params["fund-code"];
  const descriptionCode = params["description-code"];
  const caseCode = params["case-code"];

  const breadcrumbItems = [
    {
      href: "/archives",
      text: <IoHome />,
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
    <HStack justifyContent="space-between" bg="white" p={2} borderRadius="lg" fontWeight="medium" fontSize="sm">
      <Breadcrumb>
        {pathname?.startsWith("/archives") &&
          breadcrumbItems.map(({ href, text }, i) => (
            <BreadcrumbItem key={href} isCurrentPage={i === breadcrumbItems.length - 1}>
              <BreadcrumbLink href={href} color={i === breadcrumbItems.length - 1 ? undefined : "blue.500"}>
                {text}
              </BreadcrumbLink>
            </BreadcrumbItem>
          ))}
      </Breadcrumb>
      <HStack>
        <Link href="/archives" color="blue.500" fontWeight={pathname === "/archives" ? 900 : 500}>
          Архіви
        </Link>
        <Link href="/resources" color="blue.500" fontWeight={pathname === "/resources" ? 900 : 500}>
          Джерела
        </Link>
        <Link href="/" color="blue.500" fontWeight={pathname === "/" ? 900 : 500}>
          Пошук
        </Link>
      </HStack>
    </HStack>
  );
};

export default Header;
