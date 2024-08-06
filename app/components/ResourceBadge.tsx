import { Badge, Box, Text, TextProps, Tooltip } from "@chakra-ui/react";
import { Resource, ResourceType } from "@prisma/client";
import { startCase } from "lodash";
import { PropsWithChildren } from "react";
import { useResources } from "../contexts/Resources";

const TYPE_COLORS: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "yellow",
  [ResourceType.FAMILY_SEARCH]: "green",
  [ResourceType.WIKIPEDIA]: "cyan",
  [ResourceType.BABYN_YAR]: "black",
};

interface ResourceBadgeProps extends TextProps {
  resourceId: Resource["id"];
  tooltip?: string;
}

const ResourceBadge: React.FC<PropsWithChildren<ResourceBadgeProps>> = ({ resourceId, children, tooltip, ...rest }) => {
  const resources = useResources();
  const resource = resources[resourceId]?.type;
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
      <Text as="p" lineHeight={1} cursor="help" {...rest}>
        {inner}
      </Text>
    </Tooltip>
  ) : (
    inner
  );
};

export default ResourceBadge;
