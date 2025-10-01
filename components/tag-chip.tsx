"use client";

import { Chip } from "@heroui/chip";

interface TagChipProps {
  label: string;
}

function stringToColor(str: string): string {
  // Simple hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Convert hash to color
  let color = "#";
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 7)) & 0xff;
    color += ("00" + value.toString(16)).slice(-2);
  }

  return color;
}


const TagChip: React.FC<TagChipProps> = ({ label }) => {
  const bgColor = stringToColor(label);

  return (
    <Chip
      size="sm"
      style={{ backgroundColor: bgColor, color: "#fff", marginRight: 4, marginBottom: 4 }}
    >
      {label}
    </Chip>
  );
};

export default TagChip;
