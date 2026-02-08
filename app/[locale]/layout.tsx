import { ReactNode } from "react";

interface LocaleLayoutProps {
  children: ReactNode;
}

export default function LocaleLayout({ children }: LocaleLayoutProps) {
  return <>{children}</>;
}
