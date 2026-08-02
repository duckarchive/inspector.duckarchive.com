import { redirect } from "next/navigation";
import { getSessionDuckUser } from "@/lib/auth";
import NextLink from "next/link";
import clsx from "clsx";
import { ComponentProps } from "react";

const MODES = [
  { href: "/editor/catalog/fonds", label: "Фонди" },
  { href: "/editor/catalog/inventories", label: "Описи" },
  { href: "/editor/catalog/files", label: "Справи" },
  { href: "/editor/authors", label: "Автори" },
  { href: "/editor/online-copies", label: "Онлайн-копії" },
  { href: "/editor/years", label: "Роки" },
];

const LINK_CLASS = "text-base text-foreground underline-offset-4 hover:underline hover:opacity-70";

// HeroUI v3 removed Navbar and dropped router integration from Link, so the
// editor nav is plain markup over next/link.
const NavLink: React.FC<ComponentProps<typeof NextLink>> = ({ className, children, href, ...props }) => (
  <NextLink
    href={href}
    target={typeof href === "string" && href.startsWith("https") ? "_blank" : undefined}
    className={clsx(LINK_CLASS, className)}
    {...props}
  >
    {children}
  </NextLink>
);

const EditorLayout: React.FC<React.PropsWithChildren> = async ({ children }) => {
  const user = await getSessionDuckUser();

  // TODO: allow editors once the Duck API exposes is_editor: user.is_admin || user.is_editor
  if (!user?.is_admin) {
    redirect("/");
  }

  return (
    <main className="container mx-auto max-w-7xl p-6 grow flex flex-col gap-4">
      <nav className="sticky top-0 z-30 flex items-center gap-4 bg-background/70 py-3 backdrop-blur-md">
        <NextLink href="/editor" className="text-xl font-bold text-foreground">
          Редактор
        </NextLink>
        <ul className="hidden lg:flex gap-4 justify-start">
          {MODES.map((item) => (
            <li key={item.href}>
              <NavLink href={item.href}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </main>
  );
};

export default EditorLayout;
