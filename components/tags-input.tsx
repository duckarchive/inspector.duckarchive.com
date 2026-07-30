"use client";
import { useState } from "react";
import { Chip, Label, SearchField } from "@heroui/react";
import { FaBaby, FaHeart, FaLink, FaSkull } from "react-icons/fa";
import { FaHeartCrack } from "react-icons/fa6";

const tagName2tagIcon: Record<string, React.ReactNode> = {
  "доступні онлайн копії": <FaLink/>,
  народження: <FaBaby />,
  шлюб: <FaHeart />,
  розлучення: <FaHeartCrack />,
  смерть: <FaSkull />,
  // грекокатолицизм
  // дошлюбні опитування
  // іудаїзм
  // лютеранство
  // православ'я
  // протестантизм
  // римокатолицизм
  // списки парафіян
  // списки прихожан
  // сповідальні відомості
  // шлюбний обшук
};

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
      <SearchField value={filterValue} onChange={setFilterValue}>
        <Label>Шукати тег</Label>
        <SearchField.Group>
          <SearchField.SearchIcon />
          <SearchField.Input />
          <SearchField.ClearButton />
        </SearchField.Group>
      </SearchField>
      <div className="flex flex-wrap gap-1">
        {filteredTags
          // .sort((a, b) => Number(value.includes(b)) - Number(value.includes(a)) || a.localeCompare(b))
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
                {tag}
              </Chip>
            );
          })}
      </div>
    </div>
  );
};

export default TagsInput;
