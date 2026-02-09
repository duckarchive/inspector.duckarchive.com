import { routing } from "@/i18n/routing";
import { hasLocale } from "next-intl";
import { notFound } from "next/navigation";

interface LocaleLayoutProps extends React.PropsWithChildren {
  params: Promise<{ locale: string }>;
}

const LocaleLayout: React.FC<LocaleLayoutProps> = async ({ children, params }) => {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  return <>{children}</>;
};

export default LocaleLayout;
