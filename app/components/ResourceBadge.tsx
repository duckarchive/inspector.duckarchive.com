import { Badge } from "@chakra-ui/react";
import { ResourceType } from "@prisma/client";
import { PropsWithChildren } from "react";

const TYPE_COLORS: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "yellow",
  [ResourceType.FAMILY_SEARCH]: "green",
  [ResourceType.WIKIPEDIA]: "cyan",
};

interface ResourceBadgeProps {
  resource: ResourceType | null;
}

const ResourceBadge: React.FC<PropsWithChildren<ResourceBadgeProps>> = ({ resource, children }) => {
  const content = children !== undefined ? <>: {children}</> : null;
  return <Badge as="div" lineHeight={1} py={0.5} colorScheme={resource ? TYPE_COLORS[resource] : "gray"}>{resource || "Невідомий"}{content}</Badge>;
};

export default ResourceBadge;
