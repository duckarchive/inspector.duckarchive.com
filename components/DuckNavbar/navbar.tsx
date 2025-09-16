"use client";

import {
  Navbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@heroui/navbar";
import { Link, LinkProps } from "@heroui/link";
import NextLink from "next/link";
import clsx from "clsx";
import { FaTelegram } from "react-icons/fa";

import { ThemeSwitch } from "@/components/theme-switch";
import { HeartFilledIcon, Logo } from "@/components/icons";
import { useState, useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { IoChevronDown } from "react-icons/io5";
import { Accordion, AccordionItem, AccordionProps } from "@heroui/accordion";
import navigation from "./navigation.json";
import { siteConfig } from "@/config/site";
import { usePathname } from "next/navigation";
import { Popover, PopoverContent, PopoverTrigger } from "@heroui/popover";
import SelectProject from "@/components/DuckNavbar/select-project";

const LINK_CLASS = "text-base underline-offset-4 hover:underline hover:opacity-70";

interface NavItem {
  label: string;
  href: string;
  isActive?: boolean;
}

interface NavWithChildren extends Omit<NavItem, "href"> {
  isActive?: boolean;
  children: NavItem[];
}

const ExpandableNav: React.FC<NavWithChildren> = ({ label, children, isActive }) => {
  const [selectedKeys, setSelectedKeys] = useState<AccordionProps["selectedKeys"]>();
  return (
    <Accordion
      isCompact
      selectionMode="single"
      className="p-0"
      variant="light"
      defaultSelectedKeys={isActive ? [label] : undefined}
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
    >
      <AccordionItem
        key={label}
        aria-label={label}
        title={label}
        classNames={{
          trigger: `p-0 gap-1 w-auto`,
          titleWrapper: `grow-0`,
        }}
        disableIndicatorAnimation
        indicator={({ isOpen }) => (
          <IoChevronDown className={`${isOpen ? "rotate-180" : ""} transition-transform inline`} />
        )}
      >
        <ul className="mx-4 mt-2 flex flex-col gap-2">
          {children.map((child) => (
            <li key={child.href}>
              <NavLink href={child.href} className={clsx({ "underline underline-offset-4": child.isActive })}>
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </AccordionItem>
    </Accordion>
  );
};

const DropdownNav: React.FC<NavWithChildren> = ({ label, children, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Dropdown
      key={label}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      placement="bottom-start"
      radius="sm"
      triggerScaleOnOpen={false}
    >
      <DropdownTrigger className="cursor-pointer select-none">
        <div className={clsx("flex items-center gap-1", LINK_CLASS, { "underline underline-offset-4": isActive })}>
          {label}
          <IoChevronDown className={`${isOpen ? "rotate-180" : ""} transition-transform inline`} />
        </div>
      </DropdownTrigger>
      <DropdownMenu aria-label={label} variant="light" color="default">
        {children.map((child) => (
          <DropdownItem
            key={child.href}
            as={NextLink}
            href={child.href}
            color="default"
            className={clsx({ "underline underline-offset-4": child.isActive })}
            classNames={{ title: LINK_CLASS }}
          >
            {child.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};

const NavLink: React.FC<LinkProps> = (props) => (
  <Link
    as={NextLink}
    color="foreground"
    target={props.href?.startsWith("https") ? "_blank" : undefined}
    href={props.href}
    className={clsx(LINK_CLASS, props.className)}
    {...props}
  >
    {props.children}
  </Link>
);

interface NavbarComponentProps {
  siteUrl: string;
};

const NavbarComponent: React.FC<NavbarComponentProps> = ({ siteUrl }) => {
  const originSiteUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const t = useTranslations("navigation");
  const pathname = usePathname();

  useEffect(() => {
    // Check if running inside an iframe
    setIsInIframe(window !== window.top);
  }, []);

  // Return null if running inside an iframe
  if (isInIframe) {
    return null;
  }

  const navItems = useMemo(() => {
    if (!navigation) return [];
    const fullUrl = originSiteUrl + pathname;
    return navigation.map((item) => {
      const isActive = item.href
        ? fullUrl === item.href
        : item.children?.some((child) => fullUrl.startsWith(child.href));
      return {
        ...item,
        label: item.label,
        isActive,
        children: item.children?.map((child) => ({
          ...child,
          isActive: fullUrl === child.href,
          label: child.label,
        })),
      };
    });
  }, [pathname, navigation]);

  return (
    <Navbar maxWidth="xl" position="sticky" isMenuOpen={isMenuOpen} onMenuOpenChange={setIsMenuOpen}>
      <NavbarContent className="basis-1/5" justify="start">
        <NavbarBrand as="li" className="h-full relative">
          <SelectProject projects={navigation} siteUrl={originSiteUrl} />
        </NavbarBrand>
        <NavbarItem className="hidden md:flex ml-2">
          <ul className="flex gap-4 justify-start">
            {navItems.map((item) =>
              item.children ? (
                <DropdownNav key={item.label} isActive={item.isActive} label={item.label} children={item.children} />
              ) : (
                <NavbarItem key={item.href} isActive={item.isActive} className="px-0">
                  <NavLink href={item.href}>{item.label}</NavLink>
                </NavbarItem>
              )
            )}
          </ul>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="basis-1 pl-4" justify="end">
        <Link isExternal aria-label="Support Project" className="text-default-500" href={siteConfig.links.sponsor}>
          <HeartFilledIcon className="text-danger" />
        </Link>
        <Link isExternal aria-label="Telegram Chat" className="text-default-500" href={siteConfig.links.telegram}>
          <FaTelegram size={20} />
        </Link>
        <ThemeSwitch />
        {/* <LocaleSelector /> */}
        <NavbarMenuToggle className="md:hidden" />
      </NavbarContent>

      <NavbarMenu>
        <ul className="mx-4 mt-2 flex flex-col gap-2">
          {navItems.map((item) =>
            item.children ? (
              <ExpandableNav key={item.label} isActive={item.isActive} children={item.children} label={item.label} />
            ) : (
              <NavbarMenuItem key={`${item.label}`} isActive={item.isActive}>
                <NavLink href={item.href} onPress={() => setIsMenuOpen((prev) => !prev)}>
                  {item.label}
                </NavLink>
              </NavbarMenuItem>
            )
          )}
        </ul>
      </NavbarMenu>
    </Navbar>
  );
};

export default NavbarComponent;
