"use client";

import { DuckTable, sortCode } from "@duckarchive/framework";
import { ColDef } from "ag-grid-community";
import { useEffect, useState } from "react";
import { Resource } from "@/generated/prisma/client";
import { useTheme } from "next-themes";
import useIsMobile from "@/hooks/useIsMobile";

const INSPECTOR_FILTERS = [
  {
    id: "PRE_USSR_FUNDS",
    title: "Фонди до 1917",
    value: {
      conditions: [
        {
          type: "notContains",
          filter: "Р",
        },
        {
          type: "notContains",
          filter: "П",
        },
      ],
      operator: "AND",
    },
  },
  {
    id: "USSR_FUNDS",
    title: "Фонди після 1917",
    value: {
      type: "startsWith",
      filter: "Р",
    },
  },
  {
    id: "PART_FUNDS",
    title: "Фонди ПРУ",
    value: {
      type: "startsWith",
      filter: "П",
    },
  },
];

interface DuckTableProps<T> {
  resources?: Record<Resource["id"], Resource>;
  columns: ColDef<T>[];
  rows: T[];
  isFiltersEnabled?: boolean;
  isLoading?: boolean;
  loadingPage?: number;
}

const InspectorDuckTable = <T,>({ columns, rows, isFiltersEnabled, isLoading, loadingPage }: DuckTableProps<T>) => {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>();

  const firstColumn = columns[0];
  const middleColumns = columns.slice(1, -1);
  const lastColumn = columns.length === 1 ? null : columns[columns.length - 1];

  // useEffect(() => {
  //   setTimeout(() => {
  //     console.log("sizeColumnsToFit");
  //     gridRef.current?.api?.sizeColumnsToFit();
  //   }, 2000);
  // }, [columns]);

  useEffect(() => {
    setMounted(true);
    if (typeof navigator !== "undefined") {
      const ua = navigator.userAgent;
      const firefoxMatch = ua.match(/Firefox\/(\d+)/);
      if (firefoxMatch && parseInt(firefoxMatch[1], 10) <= 115) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        import("ag-grid-community/styles/ag-grid.css");
      }
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <DuckTable<T>
      appTheme={theme}
      filters={isFiltersEnabled ? INSPECTOR_FILTERS : []}
      activeFilterId={activeQuickFilter}
      setActiveFilterId={setActiveQuickFilter}
      columns={[
        {
          headerName: "Індекс",
          flex: isMobile ? 2 : 1,
          resizable: isMobile ? true : false,
          filter: true,
          comparator: sortCode,
          ...firstColumn,
        },
        ...middleColumns,
        ...(lastColumn
          ? [
              {
                resizable: false,
                ...lastColumn,
              },
            ]
          : []),
        // {
        //   type: "numericColumn",
        //   flex: 2,
        //   minWidth: 200,
        //   resizable: false,
        //   comparator: sortByOnlineCopies,
        //   cellRenderer: (row: IRowNode<{ id: string; matches: Match[] }>) => (
        //     <div className="flex h-10 items-center justify-end gap-1 flex-wrap">
        //       {row.data?.matches?.map(
        //         ({ updated_at, children_count, resource_id }) =>
        //           Boolean(children_count) &&
        //           resources && (
        //             <ResourceBadge
        //               key={`${row.data?.id}_match_${resource_id}`}
        //               resources={resources}
        //               resourceId={resource_id}
        //               tooltip={getSyncAtLabel(updated_at)}
        //             >
        //               {children_count}
        //             </ResourceBadge>
        //           )
        //       )}
        //     </div>
        //   ),
        //   ...lastColumn,
        // },
      ]}
      rows={rows}
      isLoading={isLoading}
      loadingPage={loadingPage}
      defaultColDef={{
        wrapText: true,
        autoHeight: true,
      }}
    />
  );
};

export default InspectorDuckTable;
