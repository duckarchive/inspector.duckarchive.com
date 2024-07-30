"use client";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  HStack,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Show,
  Text,
} from "@chakra-ui/react";
import useCyrillicParams from "../hooks/useCyrillicParams";
import { usePathname } from "next/navigation";
import { Link } from "@chakra-ui/next-js";
import { IoChevronDown, IoHome } from "react-icons/io5";

const NAV = [
  { href: "/archives", text: "Архіви" },
  { href: "/resources", text: "Джерела" },
  { href: "/", text: "Пошук" },
];

const isActiveLink = (pathname: string | null, href: string) => {
  if (href === "/") {
    return href === pathname;
  }
  return pathname?.startsWith(href);
}

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
      <HStack hideBelow="md">
        {NAV.map(({ href, text }) => (
          <Link key={href} href={href} color="blue.500" fontWeight={isActiveLink(pathname, href) ? 700 : 500}>
            {text}
          </Link>
        ))}
      </HStack>
      <Show below="md">
        <Menu>
          <MenuButton as={Button} variant="transparent" size="sm" rightIcon={<IoChevronDown />}>
            {NAV.find(({ href }) => isActiveLink(pathname, href))?.text || "Навігація"}
          </MenuButton>
          <MenuList>
            {NAV.map(({ href, text }) => (
              <MenuItem key={href} as={Link} href={href}>
                {text}
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
      </Show>
    </HStack>
  );
};

export default Header;
