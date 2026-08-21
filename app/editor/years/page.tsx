"use client";

import { useState } from "react";
import { Chip, toast } from "@heroui/react";
import InspectorDuckTable from "@/components/table";
import PendingButton from "@/components/pending-button";
import { usePost } from "@/hooks/useApi";
import { useYearOverlaps, useYearAnomalies } from "@/hooks/useEditor";
import { YearEntity, YEAR_ENTITY_LABELS, YearRangeRow } from "@/lib/year-entity";
import { YearOverlapGroup } from "@/app/api/editor/years/overlaps/data";
import { MergeYearRangesBody, MergeYearRangesResponse } from "@/app/api/editor/years/overlaps/merge/route";
import { YearAnomalyRow } from "@/app/api/editor/years/anomalies/data";
import { DeleteYearRangeBody, DeleteYearRangeResponse } from "@/app/api/editor/years/anomalies/delete/route";

const ENTITY_COLOR: Record<YearEntity, "accent" | "default" | "success"> = {
  fond: "accent",
  inventory: "default",
  file: "success",
};

const formatRanges = (ranges: YearRangeRow[]) => ranges.map((r) => `${r.start_year}–${r.end_year}`).join(", ");

const TruncationNote: React.FC<{ truncated?: Record<YearEntity, boolean> }> = ({ truncated }) => {
  if (!truncated) return null;
  const flagged = (Object.keys(truncated) as YearEntity[]).filter((e) => truncated[e]);
  if (flagged.length === 0) return null;
  return (
    <Chip size="sm" color="warning" variant="soft">
      Показано перші 500 для: {flagged.map((e) => YEAR_ENTITY_LABELS[e]).join(", ")} — можливо є ще
    </Chip>
  );
};

const OverlapsSection: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, mutate } = useYearOverlaps(enabled);
  const { trigger, isMutating } = usePost<MergeYearRangesResponse, MergeYearRangesBody>("/api/editor/years/overlaps/merge");

  const handleMerge = async (group: YearOverlapGroup) => {
    try {
      await trigger({ entity: group.entity, parent_id: group.parent_id, ranges: group.ranges });
      toast.success("Діапазони об'єднано");
      mutate();
    } catch (error) {
      toast.danger("Помилка", { description: (error as Error).message });
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Діапазони років для об&apos;єднання</h2>
        <PendingButton size="sm" onPress={() => setEnabled(true)} isPending={enabled && isLoading}>
          Аналізувати
        </PendingButton>
        <TruncationNote truncated={data?.truncated} />
      </div>
      {data && (
        <InspectorDuckTable<YearOverlapGroup>
          id="editor-years-overlaps-table"
          isLoading={isLoading}
          rows={data.groups}
          columns={[
            {
              headerName: "Тип",
              flex: 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cellRenderer: (row: any) => (
                <Chip size="sm" color={ENTITY_COLOR[row.data.entity as YearEntity]} variant="soft">
                  {YEAR_ENTITY_LABELS[row.data.entity as YearEntity]}
                </Chip>
              ),
            },
            { field: "label", headerName: "Об'єкт", flex: 4 },
            {
              headerName: "Діапазони",
              flex: 4,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              valueGetter: (p: any) => formatRanges(p.data?.ranges ?? []),
            },
            {
              headerName: "",
              flex: 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cellRenderer: (row: any) => (
                <PendingButton size="sm" onPress={() => handleMerge(row.data)} isPending={isMutating}>
                  Об&apos;єднати
                </PendingButton>
              ),
            },
          ]}
        />
      )}
    </section>
  );
};

const AnomaliesSection: React.FC = () => {
  const [enabled, setEnabled] = useState(false);
  const { data, isLoading, mutate } = useYearAnomalies(enabled);
  const { trigger, isMutating } = usePost<DeleteYearRangeResponse, DeleteYearRangeBody>("/api/editor/years/anomalies/delete");

  const handleDelete = async (row: YearAnomalyRow) => {
    try {
      await trigger({ entity: row.entity, parent_id: row.parent_id, start_year: row.start_year, end_year: row.end_year });
      toast.success("Діапазон видалено");
      mutate();
    } catch (error) {
      toast.danger("Помилка", { description: (error as Error).message });
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold">Аномальні роки</h2>
        <PendingButton size="sm" onPress={() => setEnabled(true)} isPending={enabled && isLoading}>
          Аналізувати
        </PendingButton>
        <TruncationNote truncated={data?.truncated} />
      </div>
      {data && (
        <InspectorDuckTable<YearAnomalyRow>
          id="editor-years-anomalies-table"
          isLoading={isLoading}
          rows={data.rows}
          columns={[
            {
              headerName: "Тип",
              flex: 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cellRenderer: (row: any) => (
                <Chip size="sm" color={ENTITY_COLOR[row.data.entity as YearEntity]} variant="soft">
                  {YEAR_ENTITY_LABELS[row.data.entity as YearEntity]}
                </Chip>
              ),
            },
            { field: "label", headerName: "Об'єкт", flex: 4 },
            { field: "start_year", headerName: "Початок", flex: 1, type: "numericColumn" },
            { field: "end_year", headerName: "Кінець", flex: 1, type: "numericColumn" },
            {
              headerName: "",
              flex: 1,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              cellRenderer: (row: any) => (
                <PendingButton size="sm" variant="danger-soft" onPress={() => handleDelete(row.data)} isPending={isMutating}>
                  Видалити
                </PendingButton>
              ),
            },
          ]}
        />
      )}
    </section>
  );
};

export default function EditorYearsPage() {
  return (
    <section className="flex flex-col gap-8 h-full">
      <h1 className="text-2xl font-bold">Роки</h1>
      <OverlapsSection />
      <AnomaliesSection />
    </section>
  );
}
