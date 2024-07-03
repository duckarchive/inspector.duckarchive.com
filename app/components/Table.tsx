import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useRef } from "react";
import { Box, Text, Tooltip, VStack } from "@chakra-ui/react";
import { AG_GRID_LOCALE_UK } from "../utils/i18n";
import { getSyncAtLabel, sortByMatches, sortCode } from "../utils/table";
import ResourceBadge from "./ResourceBadge";

interface DuckTableProps<T> {
  columns: ColDef<T>[];
  rows: T[];
  pinnedBottomRowData?: T;
  onCreateClick?: () => void;
  onUploadClick?: () => void;
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  rightActionRenderer?: () => React.ReactNode;
  onPageChange?: (direction: number) => void;
  pagination?: { skip: number; totalCount: number; take: number };
  showSettings?: boolean;
  showActionColumn?: boolean;
  showDownload?: boolean;
  setTakeAndRefetch?: (newTake: number) => void;
}

const DuckTable = <T extends { id: string }>({ columns, rows }: DuckTableProps<T>) => {
  const gridRef = useRef<AgGridReact<T>>(null);

  const firstColumn = columns[0];
  const middleColumns = columns.slice(1, -1);
  const lastColumn = columns[columns.length - 1];

  // const preUssrFunds = useCallback(() => {
  //   gridRef
  //     .current!.api!.setColumnFilterModel("code", {
  //       conditions: [
  //         {
  //           type: "notContains",
  //           filter: "Р",
  //         },
  //         {
  //           type: "notContains",
  //           filter: "П",
  //         },
  //       ],
  //       operator: "AND",
  //     })
  //     .then(() => {
  //       gridRef.current!.api.onFilterChanged();
  //     });
  // }, []);

  // const ussrFunds = useCallback(() => {
  //   gridRef
  //     .current!.api!.setColumnFilterModel("code", {
  //       type: "startsWith",
  //       filter: "Р",
  //     })
  //     .then(() => {
  //       gridRef.current!.api.onFilterChanged();
  //     });
  // }, []);

  // const partFunds = useCallback(() => {
  //   gridRef
  //     .current!.api!.setColumnFilterModel("code", {
  //       type: "startsWith",
  //       filter: "П",
  //     })
  //     .then(() => {
  //       gridRef.current!.api.onFilterChanged();
  //     });
  // }, []);

  return (
    <>
      {/* <HStack alignItems="center">
        <Button onClick={preUssrFunds} size="sm">Фонди до 1917</Button>
        <Button onClick={ussrFunds} size="sm">Фонди після 1917</Button>
        <Button onClick={partFunds} size="sm">Фонди ПРУ</Button>
      </HStack> */}
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
