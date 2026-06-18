import { redirect } from "next/navigation";
import { Link } from "@heroui/link";
import { getSessionDuckUser } from "@/lib/auth";

const EditorLayout: React.FC<React.PropsWithChildren> = async ({ children }) => {
  const user = await getSessionDuckUser();

  // TODO: allow editors once the Duck API exposes is_editor: user.is_admin || user.is_editor
  if (!user?.is_admin) {
    redirect("/");
  }

  return (
    <main className="container mx-auto max-w-7xl p-6 flex-grow flex flex-col gap-4">
      <header className="flex items-center justify-between border-b border-default-200 pb-4">
        <Link href="/editor" className="text-xl font-bold text-foreground">
          Редактор каталогу
        </Link>
        <Link href="/" size="sm">
          ← На головну
        </Link>
      </header>
      {children}
    </main>
  );
};

export default EditorLayout;
