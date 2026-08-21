"use client";

import { useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import { FaCheck, FaRegCopy } from "react-icons/fa";

interface CopyableCodeProps {
  code: string;
  className?: string;
}

/**
 * Replacement for HeroUI v2's `Snippet`, which was removed in v3: a code block
 * with a copy-to-clipboard button.
 */
const CopyableCode: React.FC<CopyableCodeProps> = ({ code, className }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <div className={`flex items-start gap-2 rounded-md bg-surface-secondary p-4 ${className ?? ""}`}>
      <pre className="flex-1 min-w-0 whitespace-pre-wrap break-all font-mono text-sm">{code}</pre>
      <Tooltip delay={0}>
        <Tooltip.Trigger>
          <Button isIconOnly size="sm" variant="ghost" aria-label="Копіювати" onPress={handleCopy}>
            {copied ? <FaCheck /> : <FaRegCopy />}
          </Button>
        </Tooltip.Trigger>
        <Tooltip.Content>{copied ? "Скопійовано!" : "Копіювати"}</Tooltip.Content>
      </Tooltip>
    </div>
  );
};

export default CopyableCode;
