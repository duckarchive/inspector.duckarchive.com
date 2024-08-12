"use client";

import { Input } from "@nextui-org/input";
import { useRouter } from "next/navigation";
import { SearchIcon } from "./icons";
import { Button } from "@nextui-org/button";
import { FaFeather } from "react-icons/fa";

interface SearchInputPortableProps {
  placeholder?: string;
}

const SearchInputPortable: React.FC<SearchInputPortableProps> = ({ placeholder }) => {
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const search = (e.target as HTMLFormElement)["search-case"].value;
    router.push(`/search?q=${search}`);
  };

  return (
    <form className="flex flex-wrap" onSubmit={handleSearch}>
      <Input
        size={placeholder ? "lg" : "md"}
        name="search-case"
        aria-label="Search"
        classNames={{
          inputWrapper: "bg-default-100 mb-2",
          input: "text-sm",
        }}
        labelPlacement="outside"
        placeholder={placeholder || "Шукати справу"}
        startContent={<SearchIcon className="text-base text-default-400 pointer-events-none flex-shrink-0" />}
        type="search"
      />
      {placeholder && (
        <Button type="submit" color="primary" variant="light" className="w-full" endContent={<FaFeather />}>
          Полетіли
        </Button>
      )}
    </form>
  );
};

export default SearchInputPortable;
