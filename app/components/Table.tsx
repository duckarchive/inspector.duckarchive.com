import { AgGridReact } from "ag-grid-react";
import { ColDef, ITextFilterParams } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useEffect, useRef, useState } from "react";
import { Box, Button, HStack, Text, Tooltip, VStack } from "@chakra-ui/react";
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
      <HStack alignItems="center">
        {enabledFilters?.[QuickFilter.PRE_USSR_FUNDS] && (
          <Button
            onClick={handleFilterClick(QuickFilter.PRE_USSR_FUNDS)}
            size="sm"
            colorScheme="blue"
            variant={activeQuickFilter === QuickFilter.PRE_USSR_FUNDS ? "solid" : "outline"}
          >
            Фонди до 1917
          </Button>
        )}
        {enabledFilters?.[QuickFilter.USSR_FUNDS] && (
          <Button
            onClick={handleFilterClick(QuickFilter.USSR_FUNDS)}
            size="sm"
            colorScheme="blue"
            variant={activeQuickFilter === QuickFilter.USSR_FUNDS ? "solid" : "outline"}
          >
            Фонди після 1917
          </Button>
        )}
        {enabledFilters?.[QuickFilter.PART_FUNDS] && (
          <Button
            onClick={handleFilterClick(QuickFilter.PART_FUNDS)}
            size="sm"
            colorScheme="blue"
            variant={activeQuickFilter === QuickFilter.PART_FUNDS ? "solid" : "outline"}
          >
            Фонди ПРУ
          </Button>
        )}
      </HStack>
      <Box as="div" className="ag-theme-alpine" w="100%" h={300} flexGrow={1}>
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
                <VStack h="full" alignItems="flex-end" justifyContent="center">
                  {row.data.matches?.map(
                    ({ updated_at, children_count, resource: { type } }: any) =>
                      children_count && (
                        <Tooltip
                          label={getSyncAtLabel(updated_at)}
                          hasArrow
                          key={`${row.data.id}_match_${type}`}
                          placement="left"
                        >
                          <Text as="p">
                            <ResourceBadge resource={type}>{children_count}</ResourceBadge>
                          </Text>
                        </Tooltip>
                      )
                  )}
                </VStack>
              ),
              ...lastColumn,
            },
          ]}
          suppressHorizontalScroll
          colResizeDefault="shift"
          localeText={AG_GRID_LOCALE_UK}
          pagination
          enableCellTextSelection
          paginationPageSize={20}
          alwaysShowVerticalScroll
          defaultColDef={{
            resizable: true,
            minWidth: 100,
            filterParams: {
              buttons: ["clear"],
            } as ITextFilterParams,
          }}
          autoSizeStrategy={{
            type: "fitGridWidth",
          }}
        />
      </Box>
    </>
  );
};

export default DuckTable;
