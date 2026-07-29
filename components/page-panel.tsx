import { JSX, PropsWithChildren } from "react";
import NavigationBreadcrumbs from "./breadcrumbs";

interface PagePanelProps extends PropsWithChildren {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  basePath?: string;
  message?: JSX.Element;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, message, children, breadcrumbs, basePath }) => {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4 w-full">
      <div className="grow">
        {breadcrumbs ? (
          <NavigationBreadcrumbs breadcrumbs={breadcrumbs} title={title} basePath={basePath} />
        ) : (
          <h1 className="text-lg">{title}</h1>
        )}

        {description && <p className="flex-shrink-0">{description}</p>}
        {message}
      </div>
      <div>
        {children}
      </div>
    </div>
  );
};

export default PagePanel;
