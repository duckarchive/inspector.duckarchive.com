"use client";

import { useSession } from "next-auth/react";
import { Button } from "@heroui/react";
import { FaDownload } from "react-icons/fa";

interface CsvDownloadButtonProps {
  filename: string;
  rows: Record<string, string | number | null | undefined>[];
  isDisabled?: boolean;
}

const CsvDownloadButton: React.FC<CsvDownloadButtonProps> = ({ filename, rows, isDisabled }) => {
  const { status } = useSession();

  const handleClick = () => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const csvHeader = headers.join(",");
    const csvRows = rows.map((row) =>
      headers.map((header) => `"${String(row[header] ?? "").replace(/"/g, '""')}"`).join(","),
    );
    const csvContent = [csvHeader, ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (status !== "authenticated") return null;

  return (
    <Button isIconOnly size="sm" variant="outline" isDisabled={isDisabled || rows.length === 0} onPress={handleClick}>
      <FaDownload />
    </Button>
  );
};

export default CsvDownloadButton;
