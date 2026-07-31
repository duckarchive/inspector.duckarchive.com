import { getNav } from "@/app/navigation";
import LangSync from "@/components/lang-sync";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getSessionDuckUser } from "@/lib/auth";
import { DuckNav } from "@duckarchive/framework";
import { hasLocale, NextIntlClientProvider } from "next-intl";
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

  const user = await getSessionDuckUser();

  return (
    // The root layout's provider never re-renders on client-side locale
    // switches (it sits above the [locale] segment), which left client
    // components with stale messages. This nested provider re-renders per
    // segment and inherits locale/messages from the server request config.
    <NextIntlClientProvider>
      <LangSync locale={locale} />
      <DuckNav siteUrl={siteConfig.url} locales={routing.locales} items={getNav(t, Boolean(user?.is_admin))} />
      <main className="container mx-auto max-w-7xl p-6 flex-grow flex flex-col">{children}</main>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
