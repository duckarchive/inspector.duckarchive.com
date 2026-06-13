"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { Input } from "@heroui/input";
import { FaSearch } from "react-icons/fa";
import { useEffect, useState } from "react";
import { sendGAEvent } from "@next/third-parties/google";
import { useTranslations } from "next-intl";
import SelectArchive from "@/components/select-archive";
import { Archives } from "@/data/archives";
import { buildOnlineCopyQuery } from "@/lib/online-copy-query";

interface SearchInputProps {
  archives: Archives;
}

const SearchInput: React.FC<SearchInputProps> = ({ archives }) => {
  const t = useTranslations("search-input");
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [archive, setArchive] = useState<string | undefined>(undefined);

  // Pick a random archive on load (client-only, to avoid a hydration mismatch).
  useEffect(() => {
    if (archives.length > 0) {
      const random = archives[Math.floor(Math.random() * archives.length)];
      setArchive(random.code);
    }
  }, [archives]);

  const handleChange = (value: string) => {
    const withFixedFundCode = value.replace(/[\/-\s\t](Р|П)[\/-\s\t]/gi, " $1");
    const withDelimiter = withFixedFundCode.replace(/[\s\t\/]/g, "-");
    setSearch(withDelimiter);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = buildOnlineCopyQuery(archive, search.trim());

    if (!q) {
      return;
    }

    sendGAEvent("event", "search-input", { value: q });
    router.push(`/online-copy-search?q=${encodeURIComponent(q)}`);
  };

  return (
    <form className="flex flex-wrap gap-2" onSubmit={handleSearch}>
      <div className="flex w-full gap-2 items-stretch">
        <SelectArchive
          archives={archives}
          value={archive}
          onChange={(v) => v && setArchive(v.toString())}
          withoutTitle
          size="md"
          className="basis-1/3 md:basis-1/4 shrink-0"
        />
        <Input
          className="grow"
          label={t("label")}
          size="md"
          placeholder="Р6193*-П____7"
          value={search}
          onValueChange={handleChange}
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
