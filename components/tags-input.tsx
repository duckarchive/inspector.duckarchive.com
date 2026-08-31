"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Chip, SearchField } from "@heroui/react";
import { FaBaby, FaHeart, FaLink, FaSkull } from "react-icons/fa";
import { FaHeartCrack } from "react-icons/fa6";

// Keyed by the raw catalog tag values — those are what the API filters on.
const tagName2tagIcon: Record<string, React.ReactNode> = {
  "доступні онлайн копії": <FaLink/>,
  народження: <FaBaby />,
  шлюб: <FaHeart />,
  розлучення: <FaHeartCrack />,
  смерть: <FaSkull />,
};

interface TagsInputProps {
  tags: string[];
  value: string[];
  onSelectionChange: (value: string[]) => void;
}

const TagsInput: React.FC<TagsInputProps> = ({ tags, value, onSelectionChange }) => {
  const t = useTranslations("tags-input");
  const tTags = useTranslations("tags");
  const [filterValue, setFilterValue] = useState("");

  // Chips submit the raw Cyrillic tag but display the localized label, so the
  // filter box matches against both.
  const tagLabel = (tag: string) => (tTags.has(tag) ? tTags(tag) : tag);

  const handleSelectionChange = (tag: string) => {
    const newValue = value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag];
    onSelectionChange(newValue);
  };

  const needle = filterValue.toLowerCase();
  const filteredTags = tags.filter(
    (tag) => tag.toLowerCase().includes(needle) || tagLabel(tag).toLowerCase().includes(needle),
  );

  return (
    <div className="flex flex-col gap-2">
      <SearchField value={filterValue} onChange={setFilterValue}>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input placeholder={t("search-placeholder")} />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <div className="flex flex-wrap gap-1">
        {filteredTags
          .map((tag) => {
            const isIncluded = value.includes(tag);
            return (
              <Chip
                key={tag}
                variant={isIncluded ? "primary" : "soft"}
                color={isIncluded ? "accent" : "default"}
                onClick={() => handleSelectionChange(tag)}
                className="cursor-pointer"
              >
                {tagName2tagIcon[tag] || null}
                {tagLabel(tag)}
              </Chip>
            );
          })}
      </div>
    </div>
  );
};

export default TagsInput;
