import {
  Navbar as NextUINavbar,
  NavbarContent,
  NavbarMenu,
  NavbarMenuToggle,
  NavbarBrand,
  NavbarItem,
  NavbarMenuItem,
} from "@nextui-org/navbar";
import { Link } from "@nextui-org/link";
import { Input } from "@nextui-org/input";
import { link as linkStyles } from "@nextui-org/theme";
import NextLink from "next/link";
import clsx from "clsx";
import { FaTelegram } from "react-icons/fa";

import { siteConfig } from "@/config/site";
import { ThemeSwitch } from "@/components/theme-switch";
import { HeartFilledIcon, Logo } from "@/components/icons";
import SearchInputPortable from "./search-input-portable";
import { Button } from "@nextui-org/button";

export const Navbar: React.FC = () => {
  return (
    <NextUINavbar maxWidth="xl" position="sticky">
      <NavbarContent className="basis-1/5 sm:basis-full" justify="start">
        <NavbarBrand as="li" className="gap-3 max-w-fit">
          <NextLink className="text-transparent hover:text-warning flex justify-start items-center gap-1" href="/">
            <Logo className="duration-200 stroke-foreground" />
            <p className="font-bold text-foreground">Інспектор</p>
          </NextLink>
        </NavbarBrand>
        <ul className="hidden md:flex gap-4 justify-start ml-2">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href}>
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
      </NavbarContent>

      <NavbarContent className="hidden sm:flex basis-1/5 sm:basis-full" justify="end">
        <NavbarItem className="hidden md:flex gap-2">
          <Link isExternal aria-label="Support Project" className="text-default-500" href={siteConfig.links.sponsor}>
            <HeartFilledIcon className="text-danger" />
          </Link>
          <Link isExternal aria-label="Telegram Chat" className="text-default-500" href={siteConfig.links.telegram}>
            <FaTelegram size={20} />
          </Link>
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
            <NavbarMenuItem key={`${item}-${index}`}>
              <Link color="foreground" href={item.href} size="lg">
                {item.label}
              </Link>
            </NavbarMenuItem>
          ))}
        </div>
      </NavbarMenu>
    </NextUINavbar>
  );
};
