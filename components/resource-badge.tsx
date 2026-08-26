"use client";

import { PropsWithChildren } from "react";
import { Chip, Tooltip } from "@heroui/react";
import { ResourceType } from "@generated/prisma/client/enums";
import { Resource } from "@generated/prisma/client/client";

/**
 * A resource is an identity, not a status, so these are categorical fills rather
 * than HeroUI's semantic chip colors (accent/danger/success carry meaning
 * elsewhere and shouldn't be spent here).
 *
 * One fill per resource, theme-independent: each is mid-tone, so it separates
 * from both the light (#f9f9fc) and dark (#131316) ground, and dark enough to
 * clear 4.5:1 against the white label. Hues avoid the accent orange.
 */
export const TYPE_CHIP_CLASS: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "bg-[#6b3fa0] text-white",
  [ResourceType.FAMILY_SEARCH]: "bg-[#006c47] text-white",
  [ResourceType.WIKIPEDIA]: "bg-[#5b6470] text-white",
  [ResourceType.BABYN_YAR]: "bg-[#336666] text-white",
  [ResourceType.WEBSITE]: "bg-[#7c4a63] text-white",
  [ResourceType.GOOGLE_DRIVE]: "bg-[#1a5fb4] text-white",
  [ResourceType.USHMM]: "bg-[#7c7c7c] text-white",
  [ResourceType.AROLSEN]: "bg-[#7c7c7c] text-white",
};

export const TYPE_LABEL: Record<ResourceType, string> = {
  [ResourceType.ARCHIUM]: "АРХІУМ",
  [ResourceType.FAMILY_SEARCH]: "Family Search",
  [ResourceType.WIKIPEDIA]: "Вікіджерела",
  [ResourceType.BABYN_YAR]: 'Архів Бабин Яр',
  [ResourceType.WEBSITE]: "Вебсайт",
  [ResourceType.GOOGLE_DRIVE]: "Google Drive",
  [ResourceType.USHMM]: "United States Holocaust Memorial Museum",
  [ResourceType.AROLSEN]: "Arolsen Archives",
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
    <Chip variant="soft" className={resource ? TYPE_CHIP_CLASS[resource] : undefined}>
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
