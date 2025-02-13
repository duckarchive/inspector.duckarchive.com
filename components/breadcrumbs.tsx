"use client";

import { BreadcrumbItem, Breadcrumbs } from "@heroui/react";
import { FaHome } from "react-icons/fa";

interface NavigationBreadcrumbsProps {
  breadcrumbs: string[];
  title: string;
}

const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({ breadcrumbs, title }) => (
  <Breadcrumbs
    separator="/"
    size="lg"
    itemClasses={{
      item: "text-gray-500 text-lg data-[current=true]:font-bold",
      separator: "text-gray-500/60",
    }}
  >
    <BreadcrumbItem href="/archives/" aria-label="Повернутись на список архівів">
      <FaHome />
    </BreadcrumbItem>
    {breadcrumbs.map((item, index) =>
      index === breadcrumbs.length - 1 ? (
        <BreadcrumbItem key={`${index}-bradcrumb`}>
          <h1>{title}</h1>
        </BreadcrumbItem>
      ) : (
        <BreadcrumbItem key={`${index}-bradcrumb`} href={`/archives/${breadcrumbs.slice(0, index + 1).join("/")}`}>
          {item}
        </BreadcrumbItem>
      ),
    )}
  </Breadcrumbs>
);

export default NavigationBreadcrumbs;
