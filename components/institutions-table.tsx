// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import dynamic from "next/dynamic";
import { Author } from "@/generated/prisma/client";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

interface InstitutionsTableProps {
  authors: Author[];
}

const InstitutionsTable: React.FC<InstitutionsTableProps> = ({ authors }) => {
  return (
    <>
      <div className="h-64 grow">
        <GeoDuckMap
          key="static-geoduck-map"
          className="rounded-lg text-primary"
          positions={authors.map((author) => [author.lat || 0, author.lng || 0])}
          hideLayers={{ searchInput: true, historicalLayers: true }}
          scrollWheelZoom
          zoom={6}
          dragging
        />
      </div>
    </>
  );
};

export default InstitutionsTable;
