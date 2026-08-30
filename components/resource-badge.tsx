"use client";

import { PropsWithChildren } from "react";
import { Chip, Tooltip } from "@heroui/react";
import { ResourceType } from "@generated/prisma/client/enums";
import { Resource } from "@generated/prisma/client/client";
import clsx from "clsx";
import { useTranslations } from "next-intl";

export const TYPE_CHIP_CLASS: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "bg-[#c74c13] text-white",
  [ResourceType.FAMILY_SEARCH]: "bg-[#0a8338] text-white",
  [ResourceType.WIKIPEDIA]: "bg-[#005174] text-white",
  [ResourceType.BABYN_YAR]: "bg-[#000] text-white",
  [ResourceType.WEBSITE]: "bg-[#6e0f38] text-white",
  [ResourceType.GOOGLE_DRIVE]: "bg-[#106d56] text-white",
  [ResourceType.USHMM]: "bg-[#10061f] text-white",
  [ResourceType.AROLSEN]: "bg-[#79221c] text-white",
  [ResourceType.LIBRARY]: "bg-[#2c3441] text-white",
  [ResourceType.LIBRARIA]: "bg-[#00235b] text-white",
};

export const TYPE_LABEL: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "АРХІУМ",
  [ResourceType.FAMILY_SEARCH]: "Family Search",
  [ResourceType.WIKIPEDIA]: "Вікіджерела",
  [ResourceType.BABYN_YAR]: 'Архів Бабин Яр',
  [ResourceType.WEBSITE]: "Вебсайт",
  [ResourceType.GOOGLE_DRIVE]: "Google Drive",
  [ResourceType.USHMM]: "USHMM",
  [ResourceType.AROLSEN]: "Arolsen",
  [ResourceType.LIBRARY]: "Бібліотека",
  [ResourceType.LIBRARIA]: "LIBRARIA",
};

interface ResourceBadgeProps {
  resources: Record<Resource["id"], Resource>;
  resourceId: Resource["id"];
  tooltip?: string;
}

const ResourceBadge: React.FC<PropsWithChildren<ResourceBadgeProps>> = ({
  resources,
  resourceId,
  children,
  tooltip,
  ...rest
}) => {
  const t = useTranslations("resource-badge");
  const resource = resources[resourceId]?.type;
  const prettyResource = resource && t(resource);
  const content = children !== undefined ? children : prettyResource;
  const inner = (
    <Chip variant="soft" className={clsx("py-1", resource && [TYPE_CHIP_CLASS[resource]])} style={{ lineHeight: 1 }}>
      {content || t("unknown-resource")}
    </Chip>
  );

  return tooltip ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger className="leading-4 cursor-help" {...rest}>
        {inner}
      </Tooltip.Trigger>
      <Tooltip.Content showArrow placement="left">
        <Tooltip.Arrow />
        <div className="flex flex-col">
          <p className="text-sm font-thin">{prettyResource}</p>
          <p className="text-sm">{tooltip}</p>
        </div>
      </Tooltip.Content>
    </Tooltip>
  ) : (
    inner
  );
};

export default ResourceBadge;
