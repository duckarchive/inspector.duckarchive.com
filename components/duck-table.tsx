"use client";

import { AgGridReact } from "ag-grid-react";
import { ColDef, ITextFilterParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-quartz.css";
import { useEffect, useRef, useState } from "react";
import { AG_GRID_LOCALE_UK } from "../config/i18n";
import ResourceBadge from "./resource-badge";
import { getSyncAtLabel, sortByMatches, sortCode } from "@/lib/table";
import { Resource } from "@prisma/client";
import { useTheme } from "next-themes";
import { Button } from "@heroui/button";

export enum QuickFilter {
  PRE_USSR_FUNDS = "preUssrFunds",
  USSR_FUNDS = "ussrFunds",
  PART_FUNDS = "partFunds",
  ONLINE = "online",
}

const FILTER_CONDITIONS = {
  [QuickFilter.PRE_USSR_FUNDS]: {
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
  [QuickFilter.USSR_FUNDS]: {
    type: "startsWith",
    filter: "Р",
  },
  [QuickFilter.PART_FUNDS]: {
    type: "startsWith",
    filter: "П",
  },
  [QuickFilter.ONLINE]: {},
};

interface DuckTableProps<T> {
  resources?: Record<Resource["id"], Resource>;
  columns: ColDef<T>[];
  rows: T[];
  enabledFilters?: Record<QuickFilter, boolean>;
}

const DuckTable = <T extends { id: string }>({ columns, rows, enabledFilters, resources }: DuckTableProps<T>) => {
  const { theme } = useTheme();
  const gridRef = useRef<AgGridReact<T>>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>();

  const firstColumn = columns[0];
  const middleColumns = columns.slice(1, -1);
  const lastColumn = columns[columns.length - 1];

  // useEffect(() => {
  //   setTimeout(() => {
  //     console.log("sizeColumnsToFit");
  //     gridRef.current?.api?.sizeColumnsToFit();
  //   }, 2000);
  // }, [columns]);

  useEffect(() => {
    if (!gridRef.current?.api) {
      return;
    }
    if (activeQuickFilter) {
      gridRef.current.api.setColumnFilterModel("code", FILTER_CONDITIONS[activeQuickFilter]).then(() => {
        gridRef.current?.api.onFilterChanged();
      });
    } else {
      gridRef.current.api.setColumnFilterModel("code", null).then(() => {
        gridRef.current?.api.onFilterChanged();
      });
    }
  }, [activeQuickFilter]);

  const handleFilterClick = (newFilter: QuickFilter) => () => {
    setActiveQuickFilter((prev) => (prev === newFilter ? undefined : newFilter));
  };

  return (
    <>
      <div className="flex justify-between items-center h-10">
        <div className="flex gap-1">
          {enabledFilters?.[QuickFilter.PRE_USSR_FUNDS] && (
            <Button
              radius="full"
              color="primary"
              size="sm"
              variant={activeQuickFilter === QuickFilter.PRE_USSR_FUNDS ? "solid" : "bordered"}
              onClick={handleFilterClick(QuickFilter.PRE_USSR_FUNDS)}
            >
              Фонди до 1917
            </Button>
          )}
          {enabledFilters?.[QuickFilter.USSR_FUNDS] && (
            <Button
              radius="full"
              color="primary"
              size="sm"
              variant={activeQuickFilter === QuickFilter.USSR_FUNDS ? "solid" : "bordered"}
              onClick={handleFilterClick(QuickFilter.USSR_FUNDS)}
            >
              Фонди після 1917
            </Button>
          )}
          {enabledFilters?.[QuickFilter.PART_FUNDS] && (
            <Button
              radius="full"
              color="primary"
              size="sm"
              variant={activeQuickFilter === QuickFilter.PART_FUNDS ? "solid" : "bordered"}
              onClick={handleFilterClick(QuickFilter.PART_FUNDS)}
            >
              Фонди ПРУ
            </Button>
          )}
        </div>

        {/* {enabledFilters?.[QuickFilter.PART_FUNDS] && (
          <Button
            radius="full"
            color="secondary"
            size="sm"
            isDisabled
            variant={activeQuickFilter === QuickFilter.PART_FUNDS ? "solid" : "bordered"}
            onClick={handleFilterClick(QuickFilter.PART_FUNDS)}
          >
            🛠️ Доступні 🛠️
          </Button>
        )} */}
      </div>
      <div className={`h-96 flex-grow ${theme === "dark" ? "ag-theme-quartz-dark" : "ag-theme-quartz"}`}>
        {/* @ts-ignore */}
        <AgGridReact
          ref={gridRef}
          rowData={rows}
          suppressMovableColumns
          columnDefs={[
            {
              headerName: "Індекс",
              flex: 1,
              resizable: false,
              filter: true,
              comparator: sortCode,
              ...firstColumn,
            },
            ...middleColumns,
            {
              type: "numericColumn",
              flex: 2,
              minWidth: 200,
              resizable: false,
              comparator: sortByMatches,
              cellRenderer: (row: { data: any }) => (
                <div className="flex h-10 items-center justify-end gap-1 flex-wrap">
                  {row.data.matches?.map(
                    ({ updated_at, children_count, resource_id }: any) =>
                      Boolean(children_count) &&
                      resources && (
                        <ResourceBadge
                          key={`${row.data.id}_match_${resource_id}`}
                          resources={resources}
                          resourceId={resource_id}
                          tooltip={getSyncAtLabel(updated_at)}
                        >
                          {children_count}
                        </ResourceBadge>
                      ),
                  )}
                </div>
              ),
              ...lastColumn,
            },
          ]}
          suppressHorizontalScroll
          colResizeDefault="shift"
          localeText={AG_GRID_LOCALE_UK}
          pagination
          enableCellTextSelection
          paginationPageSize={50}
          alwaysShowVerticalScroll
          defaultColDef={{
            resizable: true,
            minWidth: 100,
            filterParams: {
              buttons: ["clear"],
            } as ITextFilterParams,
          }}
        />
      </div>
    </>
  );
};

export default DuckTable;
