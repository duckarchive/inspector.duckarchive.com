"use client";

import DuckTable from "@/components/duck-table";
import useNoRussians from "../hooks/useNoRussians";
import { FamilySearchProjectWithArchive } from "../data/family-search";

type TableItem = FamilySearchProjectWithArchive;

interface FSProjectTableProps {
  projects: FamilySearchProjectWithArchive[];
}

const FSProjectTable: React.FC<FSProjectTableProps> = ({ projects }) => {
  useNoRussians();
  return (
    <DuckTable<TableItem>
      columns={[
        {
          field: "archive.code",
          headerName: "Архів",
          filter: true,
          flex: 1,
        },
        {
          field: "id",
          headerName: "Проєкт",
          filter: true,
          flex: 1,
        },
        {
          field: "updated_at",
          headerName: "Оновлено",
          filter: true,
          flex: 1,
        },
        {
          type: "numericColumn",
          field: "prev_children_count",
          headerName: "Попередня",
          flex: 1,
          comparator: undefined,
          cellRenderer: null,
        },
        {
          type: "numericColumn",
          field: "children_count",
          headerName: "Поточна",
          flex: 1,
          comparator: undefined,
          cellRenderer: null
        },
      ]}
      rows={projects}
    />
  );
};

export default FSProjectTable;
