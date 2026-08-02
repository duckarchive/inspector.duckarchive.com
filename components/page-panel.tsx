import { JSX, PropsWithChildren } from "react";
import NavigationBreadcrumbs from "./breadcrumbs";

interface PagePanelProps extends PropsWithChildren {
  code: string;
  title?: string;
  description?: string;
  breadcrumbs?: string[];
  message?: JSX.Element;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ code, title, description, message, children, breadcrumbs }) => {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4 w-full">
      <div className="grow">
        {breadcrumbs ? (
          <NavigationBreadcrumbs breadcrumbs={breadcrumbs} code={code} />
        ) : (
          <h2 className="text-lg">{code}</h2>
        )}

        {title && <h1 className="flex-shrink-0 text-2xl font-bold font-mono">{title}</h1>}
        {description && <p className="flex-shrink-0 text-sm text-gray-500">{description}</p>}
        {message}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};

export default PagePanel;
