import { AgGridReact } from "ag-grid-react";
import { ColDef, ITextFilterParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useEffect, useRef, useState } from "react";
import { Box, Button, HStack } from "@chakra-ui/react";
import { AG_GRID_LOCALE_UK } from "../utils/i18n";
import { getSyncAtLabel, sortByMatches, sortCode } from "../utils/table";
import ResourceBadge from "./ResourceBadge";

export enum QuickFilter {
  PRE_USSR_FUNDS = "preUssrFunds",
  USSR_FUNDS = "ussrFunds",
  PART_FUNDS = "partFunds",
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
};

interface DuckTableProps<T> {
  columns: ColDef<T>[];
  rows: T[];
  enabledFilters?: Record<QuickFilter, boolean>;
}

const DuckTable = <T extends { id: string }>({ columns, rows, enabledFilters }: DuckTableProps<T>) => {
  const gridRef = useRef<AgGridReact<T>>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<QuickFilter>();

  const firstColumn = columns[0];
  const middleColumns = columns.slice(1, -1);
  const lastColumn = columns[columns.length - 1];

  useEffect(() => {
    setTimeout(() => {
      gridRef.current?.api?.sizeColumnsToFit()
    }, 500);
  }, [columns]);

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
      <HStack alignItems="center" h={6}>
        {enabledFilters?.[QuickFilter.PRE_USSR_FUNDS] && (
          <Button
            onClick={handleFilterClick(QuickFilter.PRE_USSR_FUNDS)}
            size="xs"
            colorScheme="blue"
            variant={activeQuickFilter === QuickFilter.PRE_USSR_FUNDS ? "solid" : "outline"}
          >
            Фонди до 1917
          </Button>
        )}
        {enabledFilters?.[QuickFilter.USSR_FUNDS] && (
          <Button
            onClick={handleFilterClick(QuickFilter.USSR_FUNDS)}
            size="xs"
            colorScheme="blue"
            variant={activeQuickFilter === QuickFilter.USSR_FUNDS ? "solid" : "outline"}
          >
            Фонди після 1917
          </Button>
        )}
        {enabledFilters?.[QuickFilter.PART_FUNDS] && (
          <Button
            onClick={handleFilterClick(QuickFilter.PART_FUNDS)}
            size="xs"
            colorScheme="blue"
            variant={activeQuickFilter === QuickFilter.PART_FUNDS ? "solid" : "outline"}
          >
            Фонди ПРУ
          </Button>
        )}
      </HStack>
      <Box as="div" className="ag-theme-alpine" w="100%" h={300} flexGrow={1}>
        {/* @ts-ignore */}
        <AgGridReact
          ref={gridRef}
          rowData={rows}
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
              resizable: false,
              comparator: (_, __, { data: a }: any, { data: b }: any) => sortByMatches(a, b),
              cellRenderer: (row: { data: any }) => (
                <HStack
                  h="calc(var(--ag-row-height) - 4px)"
                  alignItems="center"
                  justifyContent="flex-end"
                  gap={1}
                  flexWrap="wrap"
                >
                  {row.data.matches?.map(
                    ({ updated_at, children_count, resource_id }: any) =>
                      children_count && (
                        <ResourceBadge
                          key={`${row.data.id}_match_${resource_id}`}
                          resourceId={resource_id}
                          tooltip={getSyncAtLabel(updated_at)}
                        >
                          {children_count}
                        </ResourceBadge>
                      )
                  )}
                </HStack>
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
      </Box>
    </>
  );
};

export default DuckTable;
