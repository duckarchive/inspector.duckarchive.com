import { redirect } from "next/navigation";
import { Link, LinkProps } from "@heroui/link";
import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/navbar";
import { getSessionDuckUser } from "@/lib/auth";
import NextLink from "next/link";
import clsx from "clsx";

const MODES = [
  { href: "/editor/catalog/fonds", label: "Фонди" },
  { href: "/editor/catalog/inventories", label: "Описи" },
  { href: "/editor/catalog/files", label: "Справи" },
  { href: "/editor/authors", label: "Автори" },
  { href: "/editor/online-copies", label: "Онлайн-копії" },
];

const LINK_CLASS = "text-base underline-offset-4 hover:underline hover:opacity-70";

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

const EditorLayout: React.FC<React.PropsWithChildren> = async ({ children }) => {
  const user = await getSessionDuckUser();

  // TODO: allow editors once the Duck API exposes is_editor: user.is_admin || user.is_editor
  if (!user?.is_admin) {
    redirect("/");
  }

  return (
    <main className="container mx-auto max-w-7xl p-6 flex-grow flex flex-col gap-4">
      <Navbar maxWidth="xl" position="sticky">
        <NavbarContent className="basis-1/5" justify="start">
          <NavbarBrand as="li" className="h-full relative grow-0">
            <Link href="/editor" className="text-xl font-bold text-foreground">
              Редактор
            </Link>
          </NavbarBrand>
          <NavbarItem className="hidden lg:flex ml-2">
            <ul className="flex gap-4 justify-start">
              {MODES.map((item) => (
                <NavbarItem key={item.href} className="px-0">
                  <NavLink href={item.href}>{item.label}</NavLink>
                </NavbarItem>
              ))}
            </ul>
          </NavbarItem>
        </NavbarContent>
      </Navbar>
      {children}
    </main>
  );
};

export default EditorLayout;
