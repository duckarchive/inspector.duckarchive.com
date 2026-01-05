"use client";
import { useState } from "react";
import { Input } from "@heroui/input";
import { Chip } from "@heroui/chip";

interface TagsInputProps {
  tags: string[];
  value: string[];
  onSelectionChange: (value: string[]) => void;
}

const TagsInput: React.FC<TagsInputProps> = ({ tags, value, onSelectionChange }) => {
  const [filterValue, setFilterValue] = useState("");

  const handleSelectionChange = (tag: string) => {
    const newValue = value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag];
    onSelectionChange(newValue);
  };

  const filteredTags = tags.filter((tag) => tag.toLowerCase().includes(filterValue.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      <Input
        isClearable
        size="sm"
        label="Шукати тег"
        value={filterValue}
        onValueChange={setFilterValue}
        onClear={() => setFilterValue("")}
      />
      <div className="flex flex-wrap gap-1">
        {filteredTags
          // .sort((a, b) => Number(value.includes(b)) - Number(value.includes(a)) || a.localeCompare(b))
          .map((tag) => {
            const isIncluded = value.includes(tag);
            return (
              <Chip
                key={tag}
                variant={isIncluded ? "solid" : "flat"}
                color={isIncluded ? "secondary" : "default"}
                onClick={() => handleSelectionChange(tag)}
                className="cursor-pointer"
              >
                {tag}
              </Chip>
            );
          })}
      </div>
    </div>
  );
};

export default TagsInput;
