'use client';

import { Resource, ResourceType } from "@prisma/client";
import { startCase } from "lodash";
import { PropsWithChildren } from "react";
import { Chip, Tooltip } from "@heroui/react";

const TYPE_COLORS: Record<ResourceType, any> = {
  [ResourceType.ARCHIUM]: "warning",
  [ResourceType.FAMILY_SEARCH]: "success",
  [ResourceType.WIKIPEDIA]: "primary",
  [ResourceType.BABYN_YAR]: "default",
  [ResourceType.WEBSITE]: "secondary",
};

interface ResourceBadgeProps {
  resources: Record<Resource["id"], Resource>;
  resourceId: Resource["id"];
  tooltip?: string;
}

const ResourceBadge: React.FC<PropsWithChildren<ResourceBadgeProps>> = ({ resources, resourceId, children, tooltip, ...rest }) => {
  const resource = resources[resourceId]?.type;
  const prettyResource = startCase(resource || "");
  const content = children !== undefined ? children : prettyResource;
  const inner = (
    <Chip color={resource ? TYPE_COLORS[resource] : "default"} size="sm" variant="solid">
      {content}
    </Chip>
  );

  return tooltip ? (
    <Tooltip
      content={
        <div className="flex flex-col">
          <p className="text-sm">{prettyResource}</p>
          <p className="text-sm">{tooltip}</p>
        </div>
      }
      showArrow
      placement="left"
    >
      <div className="leading-4 cursor-help" {...rest}>
        {inner}
      </div>
    </Tooltip>
  ) : (
    inner
  );
};

export default ResourceBadge;
