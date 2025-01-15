import { PropsWithChildren } from "react";

interface PagePanelProps extends PropsWithChildren {
  title: string;
  description?: string;
  message?: JSX.Element;
  image?: string | null;
}

const PagePanel: React.FC<PagePanelProps> = ({ title, description, message, children }) => {
  return (
    <div className="flex-col md:flex-row flex justify-between gap-4">
      <div className="flex items-start">
        <div>
          <h1 className="text-lg">{title}</h1>
          {description && <p className="text-gray-500 flex-shrink-0">{description}</p>}
          {message}
        </div>
      </div>
      {children}
    </div>
  );
};

export default PagePanel;
