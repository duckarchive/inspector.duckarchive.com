import { PropsWithChildren } from "react";

interface PagePanelProps extends PropsWithChildren {
  title: string;
  description?: string;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, children }) => {
  return (
    <div className="flex justify-between items-start">
      <div className="flex items-start">
        <div>
          <h1 className="text-lg">
            {title}
          </h1>
          {description && <p className="text-gray-500 flex-shrink-0">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
};

export default PagePanel;
