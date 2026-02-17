import { getNav } from "@/app/navigation";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { DuckNav } from "@duckarchive/framework";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface LocaleLayoutProps extends React.PropsWithChildren {
  params: Promise<{ locale: string }>;
}

const LocaleLayout: React.FC<LocaleLayoutProps> = async ({ children, params }) => {
  const { locale } = await params;
  const t = await getTranslations("navigation");
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <>
      <DuckNav siteUrl={siteConfig.url} locales={routing.locales} items={getNav(t)} />
      <main className="container mx-auto max-w-7xl py-3 px-6 flex-grow flex flex-col min-h-[calc(100vh-4rem)]">
        {children}
      </main>
    </>
  );
};

export default LocaleLayout;
