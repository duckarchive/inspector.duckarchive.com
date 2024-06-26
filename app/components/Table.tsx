import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useEffect, useRef, useState } from "react";
import { Box } from "@chakra-ui/react";

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

const DuckTable = <T extends { id: string }>({
  columns,
  rows,
}: DuckTableProps<T>) => {
  const gridRef = useRef<AgGridReact<T>>(null);

  // useEffect(() => {
  //   gridRef.current?.api?.autoSizeAllColumns();
  // }, [rows]);

  return (
    <Box className="ag-theme-alpine" h="60vh" w="960px">
      <AgGridReact
        ref={gridRef}
        domLayout="autoHeight"
        rowData={rows}
        columnDefs={columns}
        suppressHorizontalScroll
        colResizeDefault="shift"
        defaultColDef={{
          resizable: true,
          minWidth: 100,
        }}
        autoSizeStrategy={{
          type: "fitGridWidth",
        }}
      />
    </Box>
  );
};

export default DuckTable;
