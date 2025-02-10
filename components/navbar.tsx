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
import { Link } from "@heroui/link";
import { link as linkStyles } from "@heroui/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { FaTelegram } from "react-icons/fa";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { HeartFilledIcon, Logo } from "@/components/icons";
import SearchInputPortable from "./search-input-portable";
import { useState } from "react";
import { usePathname } from "next/navigation";
import useNoRussians from "../hooks/useNoRussians";

const NavbarComponent: React.FC = () => {
  useNoRussians();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  
  return (
    <Navbar
      maxWidth="xl"
      position="sticky"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="max-w-fit">
          <NextLink className="text-transparent hover:text-warning flex justify-start items-center gap-1" href="/">
            <Logo className="duration-200 stroke-foreground" />
            <p className="font-bold text-foreground">Інспектор</p>
          </NextLink>
        </NavbarBrand>
        <NavbarItem className="hidden md:flex ml-2">
          <ul className="flex gap-4 justify-start">
            {siteConfig.navItems.map((item) => (
              <NavbarItem key={item.href} isActive={pathname === item.href}>
                <NextLink
                  className={clsx(
                    linkStyles({ color: "foreground" }),
                    "data-[active=true]:text-primary data-[active=true]:font-medium",
                  )}
                  color="foreground"
                  href={item.href}
                >
                  {item.label}
                </NextLink>
              </NavbarItem>
            ))}
          </ul>
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex basis-1/5 sm:basis-full gap-2" justify="end">
        <NavbarItem className="hidden md:flex">
          <Link isExternal aria-label="Support Project" className="text-default-500" href={siteConfig.links.sponsor}>
            <HeartFilledIcon className="text-danger" />
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <Link isExternal aria-label="Telegram Chat" className="text-default-500" href={siteConfig.links.telegram}>
            <FaTelegram size={20} />
          </Link>
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <ThemeSwitch />
        </NavbarItem>
        <NavbarItem className="hidden md:flex">
          <SearchInputPortable />
        </NavbarItem>
      </NavbarContent>

      <NavbarContent className="md:hidden basis-1 pl-4" justify="end">
        <Link isExternal aria-label="Support Project" className="text-default-500" href={siteConfig.links.sponsor}>
          <HeartFilledIcon className="text-danger" />
        </Link>
        <Link isExternal aria-label="Telegram Chat" className="text-default-500" href={siteConfig.links.telegram}>
          <FaTelegram size={20} />
        </Link>
        <ThemeSwitch />
        <NavbarMenuToggle />
      </NavbarContent>

      <NavbarMenu>
        <SearchInputPortable />
        <div className="mx-4 mt-2 flex flex-col gap-2">
          {siteConfig.navItems.map((item, index) => (
            <NavbarMenuItem key={`${item}-${index}`} isActive={pathname === item.href}>
              <Link color="foreground" href={item.href} onPress={() => setIsMenuOpen((prev) => !prev)} size="lg">
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </Navbar>
  );
};

export default NavbarComponent;
