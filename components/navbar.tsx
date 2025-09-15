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
import { link as linkStyles } from "@heroui/theme";
import NextLink, { LinkProps as NextLinkProps } from "next/link";
import clsx from "clsx";
import { FaTelegram } from "react-icons/fa";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { HeartFilledIcon, Logo } from "@/components/icons";
import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from "@heroui/dropdown";
import { IoChevronDown } from "react-icons/io5";
import { Accordion, AccordionItem } from "@heroui/accordion";

interface NavItem {
  label: string;
  href: string;
}

interface NavWithChildren extends Omit<NavItem, "href"> {
  children: NavItem[];
}

const ExpandableNav: React.FC<NavWithChildren> = ({ label, children }) => {
  const [selectedKeys, setSelectedKeys] = useState(new Set(["1"]));
  return (
    <Accordion
      selectionMode="single"
      isCompact
      className="p-0"
      variant="light"
      selectedKeys={selectedKeys}
      onSelectionChange={setSelectedKeys}
    >
      <AccordionItem
        key={label}
        aria-label={label}
        title={label}
        classNames={{
          trigger: "p-0 gap-1",
          titleWrapper: "grow-0",
        }}
        disableIndicatorAnimation
        indicator={({ isOpen }) => (
          <IoChevronDown className={`${isOpen ? "rotate-180" : ""} transition-transform inline`} />
        )}
      >
        <ul className="mx-4 mt-2 flex flex-col gap-2">
          {children.map((child) => (
            <li key={child.href}>
              <NavLink
                href={child.href}
              >
                {child.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </AccordionItem>
    </Accordion>
  );
};

const NavLink: React.FC<LinkProps> = (props) => (
  <Link
    as={NextLink}
    color="foreground"
    target={props.href?.startsWith("https") ? "_blank" : undefined}
    href={props.href}
    {...props}
  >
    {props.children}
  </Link>
);

const NavbarComponent: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);
  const [activeSubMenu, setActiveSubMenu] = useState<string | null>(null);
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

  return (
    <Navbar maxWidth="xl" position="sticky" isMenuOpen={isMenuOpen} onMenuOpenChange={setIsMenuOpen}>
      <NavbarContent className="basis-1/5" justify="start">
        <NavbarBrand as="li" className="max-w-fit">
          <NextLink className="text-transparent hover:text-warning flex justify-start items-center gap-1" href="/">
            <Logo className="duration-200 stroke-foreground" />
            <p className="font-bold text-foreground">{t("logo")}</p>
          </NextLink>
        </NavbarBrand>
        <NavbarItem className="hidden md:flex ml-2">
          <ul className="flex gap-4 justify-start">
            {siteConfig.navItems.map((item) =>
              item.children ? (
                <Dropdown
                  key={item.label}
                  isOpen={activeSubMenu === item.label}
                  onOpenChange={(isOpen) => setActiveSubMenu(isOpen ? item.label : null)}
                  placement="bottom-start"
                  triggerScaleOnOpen={false}
                >
                  <DropdownTrigger className="cursor-pointer select-none">
                    <div
                      className={clsx("flex items-center gap-1", {
                        "opacity-50": activeSubMenu === item.label,
                      })}
                    >
                      {t(item.label)}
                      <IoChevronDown
                        className={`${activeSubMenu === item.label ? "rotate-180" : ""} transition-transform inline`}
                      />
                    </div>
                  </DropdownTrigger>
                  <DropdownMenu aria-label={item.label} variant="light" color="default">
                    {item.children.map((child) => (
                      <DropdownItem key={child.href} as={NextLink} href={child.href} color="primary">
                        {t(child.label)}
                      </DropdownItem>
                    ))}
                  </DropdownMenu>
                </Dropdown>
              ) : (
                <NavbarItem key={item.href} isActive={item.href === pathname} className="px-0">
                  <NavLink href={item.href}>{t(item.label)}</NavLink>
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
          {siteConfig.navItems.map((item) =>
            item.children ? (
              <ExpandableNav
                key={item.label}
                {...item}
              />
            ) : (
              <NavbarMenuItem key={`${item.label}`} isActive={pathname === item.href}>
                <NavLink href={item.href} onPress={() => setIsMenuOpen((prev) => !prev)}>
                  {t(item.label)}
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
