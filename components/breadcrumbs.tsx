"use client";

import { Breadcrumbs, BreadcrumbsItem } from "@heroui/react";
import { FaHome } from "react-icons/fa";
import { useTranslations } from "next-intl";

const BASE_PATH = "/archives/";

interface NavigationBreadcrumbsProps {
  breadcrumbs: string[];
  code: string;
}

const ITEM_CLASS = "text-gray-500 text-lg aria-[current=page]:font-bold";

const NavigationBreadcrumbs: React.FC<NavigationBreadcrumbsProps> = ({ breadcrumbs, code }) => {
  const t = useTranslations("breadcrumbs");
  return (
  <Breadcrumbs separator="/">
    <BreadcrumbsItem href={BASE_PATH} aria-label={t("home-aria")} className={ITEM_CLASS}>
      <FaHome />
    </BreadcrumbsItem>
    {breadcrumbs.map((item, index) =>
      index === breadcrumbs.length - 1 ? (
        <BreadcrumbsItem key={`${index}-bradcrumb`} className={ITEM_CLASS}>
          <h2>{code}</h2>
        </BreadcrumbsItem>
      ) : (
        <BreadcrumbsItem
          key={`${index}-bradcrumb`}
          href={`${BASE_PATH}${breadcrumbs.slice(0, index + 1).join("/")}`}
          className={ITEM_CLASS}
        >
          {item}
        </BreadcrumbsItem>
      ),
    )}
  </Breadcrumbs>
  );
};

export default NavigationBreadcrumbs;
