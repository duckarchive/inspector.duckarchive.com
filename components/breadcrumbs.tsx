"use client";

import { BreadcrumbItem, Breadcrumbs } from "@heroui/breadcrumbs";
import { FaHome } from "react-icons/fa";

interface NavigationBreadcrumbsProps {
  breadcrumbs: string[];
  title: string;
  basePath?: string;
}

const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({ breadcrumbs, title, basePath = "/archives/" }) => (
  <Breadcrumbs
    separator="/"
    size="lg"
    itemClasses={{
      item: "text-gray-500 text-lg data-[current=true]:font-bold",
      separator: "text-gray-500/60",
    }}
  >
    <BreadcrumbItem href={basePath} aria-label="Повернутись на список архівів">
      <FaHome />
    </BreadcrumbItem>
    {breadcrumbs.map((item, index) =>
      index === breadcrumbs.length - 1 ? (
        <BreadcrumbItem key={`${index}-bradcrumb`}>
          <h1>{title}</h1>
        </BreadcrumbItem>
      ) : (
        <BreadcrumbItem key={`${index}-bradcrumb`} href={`${basePath}${breadcrumbs.slice(0, index + 1).join("/")}`}>
          {item}
        </BreadcrumbItem>
      ),
    )}
  </Breadcrumbs>
);

export default NavigationBreadcrumbs;
