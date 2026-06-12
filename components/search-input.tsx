"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { FaSearch } from "react-icons/fa";
import { useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { useTranslations } from "next-intl";

const SearchInput: React.FC = () => {
  const t = useTranslations("search-input");
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const withFixedFundCode = raw.replace(/[\/-\s\t](Р|П)[\/-\s\t]/gi, " $1");
    const withDelimiter = withFixedFundCode.replace(/[\s\t\/]/g, "-");
    setSearch(withDelimiter);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();

    if (!q) {
      return;
    }

    sendGAEvent("event", "search-input", { value: q });
    router.push(`/online-copy-search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form className="flex flex-wrap gap-2" onSubmit={handleSearch}>
      <div className="flex items-center w-full py-2 px-4 border-2 rounded-xl overflow-hidden bg-background">
        <input
          type="text"
          className="text-xl md:text-4xl font-bold border-0 outline-0 w-full text-center placeholder:text-gray-500/50 bg-transparent"
          placeholder="ДАХмО*Р6193*-П____7"
          value={search}
          onChange={handleChange}
        />
      </div>
      <p className="text-sm opacity-60 w-full">{t("hint")}</p>
      <Button
        type="submit"
        color="primary"
        size="lg"
        className="w-full mt-2 font-bold text-lg"
        startContent={<FaSearch />}
      >
        {t("submit-button")}
      </Button>
    </form>
  );
};

export default SearchInput;
