// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import dynamic from "next/dynamic";
import { Author } from "@/generated/prisma/client";
import { MarkerValue } from "@duckarchive/map/dist/LocationMarker";
import { randomizeCoordinates } from "@/lib/map";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

const tag2icon: Record<string, string> = {
  "православ'я": "christChurchIcon",
  "римо-католицизм": "christChurchIcon",
  "іудаїзм": "jewChurchIcon"
};

interface InstitutionsTableProps {
  authors: Author[];
}

const InstitutionsTable: React.FC<InstitutionsTableProps> = ({ authors }) => {
  const markers: MarkerValue[] = authors.map((author) => {
    const iconTag = author.tags.find((tag) => tag in tag2icon);
    const iconName = iconTag && tag2icon[iconTag];
    return [author.lat || 0, author.lng || 0, 0, author.title, iconName];
  });
  return (
    <>
      <div className="h-64 grow">
        <GeoDuckMap
          key="static-geoduck-map"
          className="rounded-lg text-primary"
          positions={randomizeCoordinates(markers)}
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
