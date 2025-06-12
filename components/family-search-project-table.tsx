"use client";

import InspectorDuckTable from "@/components/table";
import { FamilySearchProjectWithArchive } from "@/data/family-search";

type TableItem = FamilySearchProjectWithArchive;

interface FSProjectTableProps {
  projects: FamilySearchProjectWithArchive[];
}

const FSProjectTable: React.FC<FSProjectTableProps> = ({ projects }) => {

  return (
    <InspectorDuckTable<TableItem>
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
          headerName: "Перевірено",
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
          cellRenderer: null,
        },
        {
          type: "numericColumn",
          headerName: "Різниця",
          flex: 1,
          comparator: (_, __, a, b) => {
            const diffA = (a.data?.children_count || 0) - (a.data?.prev_children_count || 0);
            const diffB = (b.data?.children_count || 0) - (b.data?.prev_children_count || 0);
            return diffA - diffB;
          },
          cellRenderer: (row: { value: number; data: TableItem }) => {
            const prev = row.data.prev_children_count || 0;
            const curr = row.data.children_count || 0;
            const diff = curr - prev;
            if (diff > 0) {
              return <span style={{ color: "green" }}>+{diff}</span>;
            }
            if (diff < 0) {
              return <span style={{ color: "red" }}>{diff}</span>;
            }
            
            return <span>{diff}</span>;
          },
        },
      ]}
      rows={projects}
    />
  );
};

export default FSProjectTable;
