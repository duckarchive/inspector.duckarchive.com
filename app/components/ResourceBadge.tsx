import { Badge, Box, Text, Tooltip } from "@chakra-ui/react";
import { ResourceType } from "@prisma/client";
import { startCase } from "lodash";
import { PropsWithChildren } from "react";

const TYPE_COLORS: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "yellow",
  [ResourceType.FAMILY_SEARCH]: "green",
  [ResourceType.WIKIPEDIA]: "cyan",
  [ResourceType.BABYN_YAR]: "black",
};

interface ResourceBadgeProps {
  resource: ResourceType | null;
  tooltip?: string;
}

const ResourceBadge: React.FC<PropsWithChildren<ResourceBadgeProps>> = ({ resource, children, tooltip }) => {
  const prettyResource = startCase(resource || "");
  const content = children !== undefined ? children : prettyResource;
  const inner = (
    <Badge lineHeight={1} py={0.5} colorScheme={resource ? TYPE_COLORS[resource] : "gray"}>
      {content}
    </Badge>
  );

  return tooltip ? (
    <Tooltip
      label={
        <Box>
          <Text>{prettyResource}</Text>
          <Text>{tooltip}</Text>
        </Box>
      }
      hasArrow
      placement="left"
    >
      <Text as="p" lineHeight={1} cursor="help">
        {inner}
      </Text>
    </Tooltip>
  ) : (
    inner
  );
};

export default ResourceBadge;
