import { JSX, PropsWithChildren } from "react";
import NavigationBreadcrumbs from "./breadcrumbs";
import CollapsibleText from "./collapsible-text";
import TranslatableText from "./translatable-text";
import TranslateToggle from "./translate-toggle";

interface PagePanelProps extends PropsWithChildren {
  /**
   * Marks title/description as catalog content (Ukrainian, from the DB) rather
   * than already-localized UI copy, so foreign readers get the translate
   * control. Static pages pass i18n strings and leave this off.
   */
  isTranslatable?: boolean;
  code?: string;
  title?: string;
  description?: string;
  breadcrumbs?: string[];
  message?: JSX.Element;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({
  code,
  title,
  description,
  message,
  children,
  breadcrumbs,
  isTranslatable,
}) => {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4 w-full mb-2">
      <div className="grow">
        {breadcrumbs ? (
          <NavigationBreadcrumbs breadcrumbs={breadcrumbs} code={code || "***"} />
        ) : (
          <h2 className="text-lg">{code}</h2>
        )}

        {title && (
          <h1 className="flex-shrink-0 text-2xl font-bold font-mono">
            {isTranslatable ? <TranslatableText>{title}</TranslatableText> : title}
          </h1>
        )}
        {description && (
          <CollapsibleText className="flex-shrink-0 text-sm text-gray-500">
            {isTranslatable ? <TranslatableText>{description}</TranslatableText> : description}
          </CollapsibleText>
        )}
        {message}
      </div>
      <div className="flex items-start gap-2">
        {isTranslatable ? <TranslateToggle /> : null}
        {children}
      </div>
    </div>
  );
};

export default PagePanel;
