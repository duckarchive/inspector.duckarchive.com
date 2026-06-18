"use client";

import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import ActionsTable from "@/components/editor/actions-table";

const MODES = [
  { href: "/editor/catalog/fonds", label: "Фонди" },
  { href: "/editor/catalog/inventories", label: "Описи" },
  { href: "/editor/catalog/files", label: "Справи" },
  { href: "/editor/authors", label: "Автори" },
  { href: "/editor/online-copies", label: "Онлайн-копії" },
];

export default function EditorDashboardPage() {
  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <Button key={m.href} as={Link} href={m.href} variant="flat" color="primary">
            {m.label}
          </Button>
        ))}
      </div>

      <ActionsTable entity="file" title="Дії над справами" />
      <ActionsTable entity="inventory" title="Дії над описами" />
      <ActionsTable entity="fond" title="Дії над фондами" />
    </section>
  );
}
