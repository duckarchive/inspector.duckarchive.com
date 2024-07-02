import { AgGridReact } from "ag-grid-react";
import { ColDef } from "ag-grid-community";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";
import { useRef } from "react";
import { Box } from "@chakra-ui/react";
import { AG_GRID_LOCALE_UK } from "../utils/i18n";

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
    <Box className="ag-theme-alpine" w="100%">
      <AgGridReact
        ref={gridRef}
        domLayout="autoHeight"
        rowData={rows}
        columnDefs={columns}
        suppressHorizontalScroll
        colResizeDefault="shift"
        localeText={AG_GRID_LOCALE_UK}
        pagination
        paginationPageSize={20}
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
