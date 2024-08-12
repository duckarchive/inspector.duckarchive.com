"use client";

import { Input } from "@nextui-org/input";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";

interface SearchInputPortableProps {};

const SearchInputPortable: React.FC<SearchInputPortableProps> = () => {
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const search = (e.target as HTMLFormElement)["search-case"].value;
    router.push(`/search?q=${search}`);
  };

  return (
    <form onSubmit={handleSearch}>
      <Input
        name="search-case"
        aria-label="Search"
        classNames={{
          inputWrapper: "bg-default-100",
          input: "text-sm",
        }}
        labelPlacement="outside"
        placeholder="Шукати справу"
        startContent={<SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />}
        type="search"
      />
    </form>
  );
};

export default SearchInputPortable;
