"use client";

import { Input } from "@heroui/input";
import { useRouter } from "next/navigation";
import { FaInfoCircle, FaSearch } from "react-icons/fa";
import { useState } from "react";
import { useDisclosure } from "@heroui/react";
import SearchInputGuideModal from "./search-input-guide-modal";

interface SearchInputPortableProps {}

const SearchInputPortable: React.FC<SearchInputPortableProps> = () => {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/search?q=${search}`);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const withFixedFundCode = raw.replace(/[-\s\t](Р|П)[-\s\t]/gi, " $1");
    const withDelimiter = withFixedFundCode.replace(/[\s\t\/]/g, "-");
    setSearch(withDelimiter);
  };

  return (
    <form className="flex flex-wrap" onSubmit={handleSearch}>
      <Input
        size="md"
        name="search-case"
        aria-label="Поле для реквізитів"
        classNames={{
          inputWrapper: "bg-default-100 relative",
          input: "text-sm",
        }}
        value={search}
        onChange={handleChange}
        labelPlacement="outside"
        placeholder="ДАХмО-Р6193-5-1"
        startContent={<FaSearch className="text-base text-default-400 pointer-events-none flex-shrink-0" />}
        endContent={<SearchInputGuideModal withoutTitle />}
        isClearable={false}
        type="search"
      />
    </form>
  );
};

export default SearchInputPortable;
