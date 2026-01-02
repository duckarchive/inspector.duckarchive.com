import { JSX, PropsWithChildren } from "react";
import NavigationBreadcrumbs from "./breadcrumbs";

interface PagePanelProps extends PropsWithChildren {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  message?: JSX.Element;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, message, children, breadcrumbs }) => {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4 w-full">
      <div className="grow">
        {breadcrumbs ? (
          <NavigationBreadcrumbs breadcrumbs={breadcrumbs} title={title} />
        ) : (
          <h1 className="text-lg">{title}</h1>
        )}

        {description && <p className="flex-shrink-0">{description}</p>}
        {message}
      </div>
      <div>
        {/* <Button size="sm" variant="light" color="warning" className="hidden md:block">Повідомити про помилку</Button> */}
        {children}
      </div>
    </div>
  );
};

export default PagePanel;
