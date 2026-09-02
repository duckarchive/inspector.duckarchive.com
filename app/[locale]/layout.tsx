import { version } from "@/package.json";
import { getNav } from "@/app/navigation";
import LangSync from "@/components/lang-sync";
import { siteConfig } from "@/config/site";
import { routing } from "@/i18n/routing";
import { getSessionDuckUser } from "@/lib/auth";
import { DuckFooter, DuckNav } from "@duckarchive/framework";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

interface LocaleLayoutProps extends React.PropsWithChildren {
  params: Promise<{ locale: string }>;
}

const LocaleLayout: React.FC<LocaleLayoutProps> = async ({ children, params }) => {
  const { locale } = await params;
  const t = await getTranslations("navigation");
  const tFooter = await getTranslations("footer");
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
      <main className="container mx-auto max-w-7xl p-6 flex-grow shrink-0 flex flex-col min-h-[calc(100dvh-4rem)]">
        {children}
      </main>
      <div className="shrink-0">
        <DuckFooter
          siteUrl={siteConfig.url}
          version={version}
          description={tFooter("description")}
          columns={[
            {
              title: tFooter("community"),
              items: [{ label: tFooter("support-project"), path: "https://ko-fi.com/duckarchive" }],
            },
            {
              title: tFooter("for-users"),
              items: [
                { label: tFooter("privacy-policy"), path: "/privacy-policy" },
                { label: tFooter("terms"), path: "/terms" },
              ],
            },
            {
              title: tFooter("for-devs"),
              items: [
                { label: tFooter("api-docs"), path: "/reference" },
                { label: tFooter("db-backup"), path: "https://archive.org/search?query=creator%3A%22inspector.duckarchive.com%22&sort=-date" },
                { label: "GitHub", path: "https://github.com/duckarchive/inspector.duckarchive.com" },
              ],
            },
          ]}
        />
      </div>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
