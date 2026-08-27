"use client";

import { useMemo, useState } from "react";
import { Button, ButtonGroup, Checkbox, Chip, Link } from "@heroui/react";
import PendingButton from "@/components/pending-button";
import { FaCheck, FaPen, FaTimes } from "react-icons/fa";
import { useEditorActions } from "@/hooks/useEditor";
import useResolveAction from "@/hooks/useResolveAction";
import {
  ACTION_STATUS_LABELS,
  ACTION_TYPE_LABELS,
  ActionStatus,
  decodeNote,
  EditorQueue,
  REPORT_SECTION_LABELS,
  ReportNotePayload,
  YearRange,
} from "@/lib/editor-actions";
import { catalogItemHref, catalogItemLabel } from "@/lib/catalog-links";
import { ActionType } from "@generated/prisma/client/client";

interface ActionsTableProps {
  entity: EditorQueue;
  title: string;
}

const STATUSES: (ActionStatus | "all")[] = ["pending", "executed", "rejected", "all"];
const STATUS_FILTER_LABELS: Record<ActionStatus | "all", string> = {
  pending: "Очікують",
  executed: "Виконані",
  rejected: "Відхилені",
  all: "Усі",
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const catalogTarget = (data: any): { label: string; href: string | null } | null => {
  const enc = (...segments: (string | undefined)[]): string | null => {
    if (segments.some((s) => !s)) return null;
    return `/archives/${segments.map((s) => encodeURIComponent(s as string)).join("/")}`;
  };
  if (data?.fond) {
    return { label: data.fond.code, href: enc(data.fond.archive?.code, data.fond.code) };
  }
  if (data?.inventory) {
    return {
      label: data.inventory.code,
      href: enc(data.inventory.fond?.archive?.code, data.inventory.fond?.code, data.inventory.code),
    };
  }
  if (data?.file) {
    const inv = data.file.inventory;
    return {
      label: data.file.full_code || data.file.code,
      href: enc(inv?.fond?.archive?.code, inv?.fond?.code, inv?.code, data.file.code),
    };
  }
  return null;
};

/** Editor catalog page for this entity with the filter cascade + edit modal prefilled. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const editorHref = (queue: EditorQueue, data: any): string | null => {
  // author queue → the authors editor with search prefilled + edit modal auto-open
  if (queue === "author" && data?.author) {
    return `/editor/authors?${new URLSearchParams({ q: data.author.title, edit: data.author.id })}`;
  }
  const entity = queue === "author" ? "file" : queue; // authorless author-rows fall back to the справа
  const q = (params: Record<string, string | undefined>): string | null => {
    if (Object.values(params).some((v) => !v)) return null;
    return new URLSearchParams(params as Record<string, string>).toString();
  };
  if (entity === "fond" && data?.fond) {
    const query = q({ archive: data.fond.archive?.code, edit: data.fond.id });
    return query ? `/editor/catalog/fonds?${query}` : null;
  }
  if (entity === "inventory" && data?.inventory) {
    const query = q({
      archive: data.inventory.fond?.archive?.code,
      fond: data.inventory.fond?.id,
      edit: data.inventory.id,
    });
    return query ? `/editor/catalog/inventories?${query}` : null;
  }
  if (entity === "file" && data?.file) {
    const inv = data.file.inventory;
    const query = q({
      archive: inv?.fond?.archive?.code,
      fond: inv?.fond?.id,
      inventory: inv?.id,
      edit: data.file.id,
    });
    return query ? `/editor/catalog/files?${query}` : null;
  }
  return null;
};

const hostLabel = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "джерело";
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const targetCell = (data: any) => {
  const target = catalogTarget(data);
  const copyUrl: string | undefined = data?.online_copy?.url ?? undefined;
  const author: { id: string; title: string } | null = data?.author ?? null;
  const mergeTarget: { id: string; title: string } | null = data?.merge_target ?? null;
  if (!target && !copyUrl && !author) return "—";
  return (
    <div className="flex flex-col gap-0.5">
      {author && (
        <span className="font-medium">
          {author.title}
          {mergeTarget && <span className="text-muted font-normal"> → {mergeTarget.title}</span>}
        </span>
      )}
      {target &&
        (target.href ? (
          <Link href={target.href} target="_blank" rel="noopener noreferrer" className="text-sm">
            {target.label}
            <Link.Icon />
          </Link>
        ) : (
          <span>{target.label}</span>
        ))}
      {copyUrl && (
        <Link href={copyUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-muted">
          {hostLabel(copyUrl)}
          <Link.Icon />
        </Link>
      )}
    </div>
  );
};

const noteLabel = (note: string | null): string => {
  const decoded = decodeNote(note);
  if (!decoded) return "";
  if ("raw" in decoded) return decoded.raw;
  // "add" payload: the whole new entity rides in value
  if (decoded.field === "parent" && typeof decoded.value === "object" && decoded.value && "code" in decoded.value) {
    const v = decoded.value as { code?: string; title?: string };
    return ["новий запис", v.code, v.title].filter(Boolean).join(" · ");
  }
  const parts: string[] = [];
  if (decoded.field) parts.push(decoded.field);
  if (decoded.value !== undefined) {
    // Several new items batched from one save (e.g. add_location/add_author) — one line per item.
    parts.push(
      Array.isArray(decoded.value)
        ? decoded.value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).join("; ")
        : typeof decoded.value === "object"
          ? JSON.stringify(decoded.value)
          : String(decoded.value),
    );
  }
  if (decoded.author_id) parts.push(`автор=${decoded.author_id.slice(0, 8)}`);
  return parts.join(": ");
};

const yearLabel = (y: YearRange) => `${y.start_year}–${y.end_year}`;

/** Section header + one line per proposed change. */
const reportSectionLines = (report: ReportNotePayload): { label: string; lines: React.ReactNode[] }[] => {
  const sections: { label: string; lines: React.ReactNode[] }[] = [];

  if (report.tree) {
    const codes = [report.tree.archive?.code, report.tree.fond?.code, report.tree.inventory?.code];
    const label = catalogItemLabel(codes);
    const href = catalogItemHref(codes);
    sections.push({
      label: REPORT_SECTION_LABELS.tree,
      lines: [
        href ? (
          <Link key="tree" href={href} target="_blank" rel="noopener noreferrer" className="text-sm">
            {label}
            <Link.Icon />
          </Link>
        ) : (
          label
        ),
        ...(report.tree.code ? [`індекс → ${report.tree.code}`] : []),
      ],
    });
  }

  if (report.online_copy) {
    const { id, url } = report.online_copy;
    sections.push({
      label: REPORT_SECTION_LABELS.online_copy,
      lines: [
        url ? (
          <Link key="copy" href={url} target="_blank" rel="noopener noreferrer" className="text-sm">
            {hostLabel(url)}
            <Link.Icon />
          </Link>
        ) : null,
        id ? `id: ${id.slice(0, 8)}` : null,
      ].filter(Boolean),
    });
  }

  if (report.data) {
    const lines: React.ReactNode[] = [];
    if (report.data.title) lines.push(`назва: "${report.data.title.old ?? ""}" → "${report.data.title.value}"`);
    if (report.data.info) lines.push(`опис: "${report.data.info.old ?? ""}" → "${report.data.info.value}"`);
    if (report.data.years) {
      const { add, remove } = report.data.years;
      const parts = [...add.map((y) => `+${yearLabel(y)}`), ...remove.map((y) => `−${yearLabel(y)}`)];
      if (parts.length) lines.push(`роки: ${parts.join(" ")}`);
    }
    sections.push({ label: REPORT_SECTION_LABELS.data, lines });
  }

  if (report.geo) {
    const lines: React.ReactNode[] = [];
    if (report.geo.authors?.length) {
      lines.push(`автори: ${report.geo.authors.map((a) => a.title).join(", ")}`);
    }
    if (report.geo.locations?.length) {
      lines.push(
        `локації: ${report.geo.locations
          .map((l) => `${l.lat.toFixed(4)},${l.lng.toFixed(4)}${l.radius_m ? ` ±${l.radius_m}м` : ""}`)
          .join(" · ")}`,
      );
    }
    sections.push({ label: REPORT_SECTION_LABELS.geo, lines });
  }

  return sections.filter((s) => s.lines.length > 0);
};

const noteCell = (note: string | null): React.ReactNode => {
  const decoded = decodeNote(note);
  const report = decoded && !("raw" in decoded) ? decoded.report : undefined;
  if (!report) {
    return noteLabel(note);
  }
  const sections = reportSectionLines(report);
  return (
    <div className="flex flex-col gap-1.5">
      {sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-0.5">
          <span className="text-xs text-muted">{section.label}</span>
          {section.lines.map((line, i) => (
            <span key={i} className="text-sm">
              {line}
            </span>
          ))}
        </div>
      ))}
      {report.text && <span className="text-sm text-muted italic">{report.text}</span>}
    </div>
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isPending = (data: any): boolean => !data?.resolved_at;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const statusChip = (data: any) => {
  if (isPending(data)) return <Chip size="sm" color="warning" variant="soft">{ACTION_STATUS_LABELS.pending}</Chip>;
  if (data.is_rejected) return <Chip size="sm" color="danger" variant="soft">{ACTION_STATUS_LABELS.rejected}</Chip>;
  return <Chip size="sm" color="success" variant="soft">{ACTION_STATUS_LABELS.executed}</Chip>;
};

const ITEMS_PER_PAGE = 200;

const ActionsTable: React.FC<ActionsTableProps> = ({ entity, title }) => {
  const [status, setStatus] = useState<ActionStatus | "all">("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const { data: actions, isLoading, mutate } = useEditorActions(entity, status === "all" ? undefined : { status });
  const { resolveMany, isResolving } = useResolveAction(entity);

  const rows = useMemo(() => actions ?? [], [actions]);
  const totalPages = useMemo(() => Math.ceil(rows.length / ITEMS_PER_PAGE), [rows.length]);
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return rows.slice(start, start + ITEMS_PER_PAGE);
  }, [rows, page]);

  const pendingIds = useMemo(() => paginatedRows.filter(isPending).map((r) => r.id), [paginatedRows]);
  const allSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const setStatusAndReset = (s: ActionStatus | "all") => {
    setStatus(s);
    setSelected(new Set());
    setPage(1);
  };

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(pendingIds));
  };

  const resolve = async (ids: string[], resolution: "execute" | "reject") => {
    if (ids.length === 0) return;
    await resolveMany(ids, resolution);
    setSelected(new Set());
    mutate();
  };

  const selectedIds = Array.from(selected);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <ButtonGroup size="sm">
            {STATUSES.map((s) => (
              <Button key={s} variant={status === s ? "primary" : "tertiary"} onPress={() => setStatusAndReset(s)}>
                {STATUS_FILTER_LABELS[s]}
              </Button>
            ))}
          </ButtonGroup>
          <PendingButton size="sm" isDisabled={selectedIds.length === 0} isPending={isResolving} onPress={() => resolve(selectedIds, "execute")}>
            Виконати обрані ({selectedIds.length})
          </PendingButton>
          <PendingButton size="sm" variant="danger-soft" isDisabled={selectedIds.length === 0} isPending={isResolving} onPress={() => resolve(selectedIds, "reject")}>
            Відхилити обрані ({selectedIds.length})
          </PendingButton>
        </div>
      </div>

      <div className="overflow-x-auto border border-default rounded-md">
        <table className="w-full text-sm">
          <thead className="bg-surface-secondary">
            <tr className="text-left">
              <th className="p-2 w-10">
                <Checkbox isSelected={allSelected} isDisabled={pendingIds.length === 0} onChange={toggleAll} aria-label="Обрати всі">
                  <Checkbox.Content>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                  </Checkbox.Content>
                </Checkbox>
              </th>
              <th className="p-2">Дія</th>
              <th className="p-2">Ціль</th>
              <th className="p-2">Деталі</th>
              <th className="p-2">Статус</th>
              <th className="p-2 text-right">Дії</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">Завантаження…</td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-muted">Немає дій</td>
              </tr>
            )}
            {paginatedRows.map((row) => {
              const pending = isPending(row);
              return (
                <tr key={row.id} className="border-t border-default align-top">
                  <td className="p-2">
                    {pending && <Checkbox isSelected={selected.has(row.id)} onChange={() => toggle(row.id)} aria-label="Обрати">
                        <Checkbox.Content>
                          <Checkbox.Control>
                            <Checkbox.Indicator />
                          </Checkbox.Control>
                        </Checkbox.Content>
                      </Checkbox>}
                  </td>
                  <td className="p-2">{ACTION_TYPE_LABELS[row.type as ActionType] ?? row.type}</td>
                  <td className="p-2">{targetCell(row)}</td>
                  <td className="p-2 max-w-xs break-words">{noteCell(row.note)}</td>
                  <td className="p-2">{statusChip(row)}</td>
                  <td className="p-2">
                    {pending && (
                      <div className="flex gap-1 justify-end">
                        <PendingButton
                          isIconOnly
                          size="sm"
                          aria-label="Виконати"
                          isPending={isResolving}
                          onPress={() => resolve([row.id], "execute")}
                        >
                          <FaCheck />
                        </PendingButton>
                        {editorHref(entity, row) && (
                          <Link
                            href={editorHref(entity, row) as string}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Редагувати вручну"
                            className="button button--secondary button--sm button--icon-only"
                          >
                            <FaPen />
                          </Link>
                        )}
                        <PendingButton
                          isIconOnly
                          size="sm"
                          variant="danger-soft"
                          aria-label="Відхилити"
                          isPending={isResolving}
                          onPress={() => resolve([row.id], "reject")}
                        >
                          <FaTimes />
                        </PendingButton>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            isDisabled={page === 1}
            onPress={() => setPage(page - 1)}
          >
            ←
          </Button>
          <span className="text-sm text-muted">
            {page} / {totalPages}
          </span>
          <Button
            isIconOnly
            variant="tertiary"
            size="sm"
            isDisabled={page === totalPages}
            onPress={() => setPage(page + 1)}
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
};

export default ActionsTable;
