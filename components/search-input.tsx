"use client";

import { useRouter } from "next/navigation";
import { Button } from "@heroui/button";
import { FaSearch } from "react-icons/fa";
import { useRef, useState } from "react";
import SearchInputGuideModal from "./search-input-guide-modal";
import { sendGAEvent } from "@next/third-parties/google";
import { useTranslations } from "next-intl";

const SearchInput: React.FC = () => {
  const t = useTranslations("search-input");
  const router = useRouter();
  const aInputRef = useRef<HTMLInputElement>(null);
  const fInputRef = useRef<HTMLInputElement>(null);
  const dInputRef = useRef<HTMLInputElement>(null);
  const cInputRef = useRef<HTMLInputElement>(null);
  const [a, setA] = useState("");
  const [f, setF] = useState("");
  const [d, setD] = useState("");
  const [c, setC] = useState("");
  const setters = [setA, setF, setD, setC];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = `${a || ""}-${f || ""}-${d || ""}-${c || ""}`;
    sendGAEvent("event", "search-input", { value: fullCode });
    router.push(`/search?q=${fullCode}`);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const raw = e.clipboardData.getData("text/plain");
    const withFixedFundCode = raw.replace(/[\/-\s\t](Р|П)[\/-\s\t]/gi, " $1");
    const withDelimiter = withFixedFundCode.replace(/[\s\t\/]/g, "-");
    const parts = withDelimiter.split("-");
    // e.preventDefault();
    // const filtered = [a, f, d, c, ...parts].filter((part) => part);
    // setA(filtered[0] || "");
    // setF(filtered[1] || "");
    // setD(filtered[2] || "");
    // setC(filtered[3] || "");
    console.log(e.target);
    if (parts.length === 4) {
      e.preventDefault();
      setters.forEach((setter, idx) => {
        setter(parts[idx]);
      });
      return false;
    } else if (parts.length === 3) {
      e.preventDefault();
      if (a) {
        setters.slice(1).forEach((setter, idx) => {
          setter(parts[idx]);
        });
      } else {
        setters.forEach((setter, idx) => {
          setter(parts[idx]);
        });
      }
      return false;
    } else if (parts.length === 2) {
      e.preventDefault();
      if (a && f) {
        setters.slice(2).forEach((setter, idx) => {
          setter(parts[idx]);
        });
      } else if (a) {
        setters.slice(1).forEach((setter, idx) => {
          setter(parts[idx]);
        });
      } else {
        setters.forEach((setter, idx) => {
          setter(parts[idx]);
        });
      }
      return false;
    } else {
      return false;
    }
  };

  const handleAChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.endsWith("-") || raw.endsWith(" ")) {
      fInputRef.current?.focus();
    } else {
      setA(raw);
    }
  };

  const handleFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.endsWith("-") || raw.endsWith(" ")) {
      dInputRef.current?.focus();
    } else {
      setF(raw);
    }
  };

  const handleFKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && f === "") {
      e.preventDefault();
      aInputRef.current?.focus();
    }
  };

  const handleDChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw.endsWith("-") || raw.endsWith(" ")) {
      cInputRef.current?.focus();
    } else {
      setD(raw);
    }
  };

  const handleDKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && d === "") {
      e.preventDefault();
      fInputRef.current?.focus();
    }
  };

  const handleCChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setC(raw);
  };

  const handleCKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && c === "") {
      e.preventDefault();
      dInputRef.current?.focus();
    }
  };

  return (
    <>
      <form className="flex flex-wrap gap-2" onSubmit={handleSearch}>
        <div className="flex justify-between w-full">
          <p className="font-bold md:text-xl">{t("label")}</p>
          <SearchInputGuideModal />
        </div>
        <div className="flex justify-between items-end w-full py-2 border-2 rounded-xl overflow-hidden">
          <div className="flex flex-col items-center flex-shrink-0 basis-1/4">
            <span className="text-gray-500">{t("archive-label")}</span>
            <input
              ref={aInputRef}
              type="text"
              className="text-xl md:text-4xl font-bold border-0 outline-0 w-full text-center placeholder:text-gray-500/50 bg-transparent"
              placeholder="ДАХмО"
              value={a}
              onChange={handleAChange}
              onPaste={handlePaste}
            />
          </div>
          <span className="text-xl md:text-4xl">-</span>
          <div className="flex flex-col items-center flex-grow basis-1/4">
            <span className="text-gray-500">{t("fund-label")}</span>
            <input
              ref={fInputRef}
              type="text"
              className="text-xl md:text-4xl font-bold border-0 outline-0 w-full text-center placeholder:text-gray-500/50 bg-transparent"
              placeholder="Р6193"
              value={f}
              onChange={handleFChange}
              onKeyDown={handleFKeyDown}
              onPaste={handlePaste}
            />
          </div>
          <span className="text-xl md:text-4xl">-</span>
          <div className="flex flex-col items-center flex-grow basis-1/4">
            <span className="text-gray-500">{t("description-label")}</span>
            <input
              ref={dInputRef}
              type="text"
              className="text-xl md:text-4xl font-bold border-0 outline-0 w-full text-center placeholder:text-gray-500/50 bg-transparent"
              placeholder="5"
              value={d}
              onChange={handleDChange}
              onKeyDown={handleDKeyDown}
              onPaste={handlePaste}
            />
          </div>
          <span className="text-xl md:text-4xl">-</span>
          <div className="flex flex-col items-center flex-grow basis-1/4">
            <span className="text-gray-500">{t("case-label")}</span>
            <input
              ref={cInputRef}
              type="text"
              className="text-xl md:text-4xl font-bold border-0 outline-0 w-full text-center placeholder:text-gray-500/50 bg-transparent"
              placeholder="11А"
              value={c}
              onChange={handleCChange}
              onKeyDown={handleCKeyDown}
              onPaste={handlePaste}
            />
          </div>
        </div>
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
    </>
  );
};

export default SearchInput;
