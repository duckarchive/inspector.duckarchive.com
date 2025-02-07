import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { PropsWithChildren } from "react";
import { FaHome } from "react-icons/fa";

interface PagePanelProps extends PropsWithChildren {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  message?: JSX.Element;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, message, children, breadcrumbs }) => {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4">
      <div className="flex items-start">
        <div>
          {breadcrumbs && (
            <Breadcrumbs
              separator="/"
              size="lg"
              itemClasses={{
                item: "text-gray-500 data-[current=true]:text-white text-lg data-[current=true]:font-bold",
                separator: "text-gray-500/60",
              }}
            >
              <BreadcrumbItem href="/archives/">
                <FaHome />
              </BreadcrumbItem>
              {breadcrumbs.map((item, index) =>
                index === breadcrumbs.length - 1 ? (
                  <BreadcrumbItem key={index}>
                    <h1 key={index}>{title}</h1>
                  </BreadcrumbItem>
                ) : (
                  <BreadcrumbItem key={index} href={`/archives/${breadcrumbs.slice(0, index + 1).join("/")}`}>
                    {item}
                  </BreadcrumbItem>
                ),
              )}
            </Breadcrumbs>
          )}

          {description && <p className="text-gray-500 flex-shrink-0">{description}</p>}
          {message}
        </div>
      </div>
      {children}
    </div>
  );
};

export default PagePanel;
