"use client";

import { InputGroup, TextField } from "@heroui/react";
import { useRouter } from "next/navigation";
import { FaSearch } from "react-icons/fa";
import { useState } from "react";
import SearchInputGuideModal from "./search-input-guide-modal";
import { sendGAEvent } from "@next/third-parties/google";
import { useTranslations } from "next-intl";

const SearchInputPortable: React.FC = () => {
  const t = useTranslations("search-input");
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    sendGAEvent('event', 'search-input-portable', { value: search });
    router.push(`/search?q=${search}`);
    setSearch("");
  };

  const handleChange = (raw: string) => {
    const withFixedFundCode = raw.replace(/[\/-\s\t](Р|П)[\/-\s\t]/gi, " $1");
    const withDelimiter = withFixedFundCode.replace(/[\s\t\/]/g, "-");
    setSearch(withDelimiter);
  };

  return (
    <form className="flex flex-wrap" onSubmit={handleSearch}>
      <TextField
        name="search-case"
        aria-label={t("portable-aria")}
        type="search"
        value={search}
        onChange={handleChange}
      >
        <InputGroup variant="secondary">
          <InputGroup.Prefix>
            <FaSearch className="text-base text-muted pointer-events-none shrink-0" />
          </InputGroup.Prefix>
          <InputGroup.Input className="text-sm" placeholder="ДАХмО-Р6193-5-1" />
          <InputGroup.Suffix>
            <SearchInputGuideModal withoutTitle />
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </form>
  );
};

export default SearchInputPortable;
