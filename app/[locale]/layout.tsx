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
          columns={[
            {
              title: tFooter("navigation"),
              items: [
                { label: t("search"), path: "/search" },
                { label: t("archives"), path: "/archives" },
                { label: t("resources"), path: "/resources" },
                { label: t("authors"), path: "/authors" },
              ],
            },
            {
              title: tFooter("reports"),
              items: [
                { label: t("daily-updates"), path: "/daily-updates" },
                { label: t("stats"), path: "/stats" },
              ],
            },
            {
              title: "Duck Archive",
              items: [
                { label: "Моя качка", path: "https://duckarchive.com" },
                {
                  label: "Справна Качка",
                  path: "https://chromewebstore.google.com/detail/%D1%81%D0%BF%D1%80%D0%B0%D0%B2%D0%BD%D0%B0-%D0%BA%D0%B0%D1%87%D0%BA%D0%B0/gldlgeliohimejlfpgihbplkchibadim",
                },
              ],
            },
          ]}
        />
      </div>
    </NextIntlClientProvider>
  );
};

export default LocaleLayout;
