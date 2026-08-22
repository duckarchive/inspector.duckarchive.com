// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import qs from "qs";
import { Author } from "@generated/prisma/client/client";
import type { MarkerValue } from "@duckarchive/map";
import { prepareLocations } from "@/lib/map";
import { SearchRequest } from "@/app/api/search/route";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

const INSTITUTION_SEARCH_RADIUS_M = 5000;

interface InstitutionsTableProps {
  authors: Author[];
}

const InstitutionsTable: React.FC<InstitutionsTableProps> = ({ authors }) => {
  const router = useRouter();

  const handleMarkerClick = ([, , , , , id]: MarkerValue) => {
    const author = authors.find((a) => a.id === id);
    if (!author || author.lat === null || author.lng === null) {
      return;
    }

    const filters: SearchRequest = {
      lat: String(author.lat),
      lng: String(author.lng),
      radius_m: INSTITUTION_SEARCH_RADIUS_M,
      tags: author.tags.length ? author.tags : undefined,
    };

    router.push(`/search?${qs.stringify(filters, { skipNulls: true })}`);
  };

  return (
    <>
      <div className="h-64 grow">
        <GeoDuckMap
          key="static-geoduck-map"
          className="rounded-lg text-accent"
          positions={prepareLocations(authors)}
          onMarkerClick={handleMarkerClick}
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
