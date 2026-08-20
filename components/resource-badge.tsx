"use client";

import { PropsWithChildren } from "react";
import { Chip, Tooltip } from "@heroui/react";
import { ResourceType } from "@generated/prisma/client/enums";
import { Resource } from "@generated/prisma/client/client";

export const TYPE_COLORS: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "warning",
  [ResourceType.FAMILY_SEARCH]: "success",
  [ResourceType.WIKIPEDIA]: "accent",
  [ResourceType.BABYN_YAR]: "default",
  [ResourceType.WEBSITE]: "default",
  [ResourceType.GOOGLE_DRIVE]: "danger",
};

export const TYPE_LABEL: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "АРХІУМ",
  [ResourceType.FAMILY_SEARCH]: "Family Search",
  [ResourceType.WIKIPEDIA]: "Вікіджерела",
  [ResourceType.BABYN_YAR]: 'Проєкт "Бабин Яр"',
  [ResourceType.WEBSITE]: "Вебсайт",
  [ResourceType.GOOGLE_DRIVE]: "Google Drive",
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
  const resource = resources[resourceId]?.type;
  const prettyResource = resource && TYPE_LABEL[resource];
  const content = children !== undefined ? children : prettyResource;
  const inner = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Chip color={resource ? (TYPE_COLORS[resource] as any) : "default"} variant="primary">
      {content || "Невідомий ресурс"}
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
