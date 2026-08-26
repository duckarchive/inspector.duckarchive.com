// @refresh reset
"use client";
import "leaflet/dist/leaflet.css";
import "../node_modules/@duckarchive/map/dist/style.css";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import qs from "qs";
import { Button, Chip, CloseButton, InputGroup, TextField } from "@heroui/react";
import { useSession } from "next-auth/react";
import { FaBug, FaFolder, FaSearch } from "react-icons/fa";
import type { Map as LeafletMap } from "leaflet";
import type { MarkerValue } from "@duckarchive/map";
import { prepareLocations } from "@/lib/map";
import { MapAuthor } from "@/data/authors";
import { PublicAuthor } from "@/app/api/authors/data";
import { SearchRequest } from "@/app/api/search/route";
import { useAuthors } from "@/hooks/useAuthors";
import InspectorDuckTable from "@/components/table";
import AuthorReportModal from "@/components/author-report-modal";

const GeoDuckMap = dynamic(() => import("@duckarchive/map").then((mod) => mod.default), {
  ssr: false,
});

/** Close enough to read street names, far enough to keep the neighbours visible. */
const FOCUS_ZOOM = 14;

interface AuthorsTableProps {
  mapAuthors: MapAuthor[];
}

const AuthorsTable: React.FC<AuthorsTableProps> = ({ mapAuthors }) => {
  const router = useRouter();
  const { status } = useSession();
  const mapRef = useRef<LeafletMap | null>(null);
  /** Drives the list: typed by hand, or written by a click on a marker. */
  const [query, setQuery] = useState("");
  const [reported, setReported] = useState<PublicAuthor | null>(null);
  const { data: authors, isLoading } = useAuthors(query || undefined);

  const positions = useMemo(() => prepareLocations(mapAuthors), [mapAuthors]);

  // Markers sharing one point are spread over a small disc, so flying to an
  // author's raw coordinates would land next to its marker rather than on it.
  const markerById = useMemo(() => {
    const byId = new Map<string, [number, number]>();
    positions.forEach(([lat, lng, , , , id]) => {
      if (id) byId.set(id, [lat, lng]);
    });
    return byId;
  }, [positions]);

  const focusOnMap = (author: PublicAuthor) => {
    const position = markerById.get(author.id);
    if (position) {
      mapRef.current?.flyTo(position, FOCUS_ZOOM);
    }
  };

  const handleMarkerClick = ([, , , title]: MarkerValue) => {
    setQuery(title ?? "");
  };

  const handleSearch = (author: PublicAuthor) => {
    const filters: SearchRequest = { author: author.title };
    router.push(`/search?${qs.stringify(filters, { skipNulls: true })}`);
  };

  return (
    <>
      <div className="flex flex-col md:flex-row grow gap-4 min-h-[75vh] md:min-h-[500px]">
        <div className="basis-1/2 min-w-0 h-64 md:h-auto">
          <GeoDuckMap
            key="static-geoduck-map"
            ref={mapRef}
            className="rounded-lg text-accent"
            positions={positions}
            onMarkerClick={handleMarkerClick}
            hideLayers={{ searchInput: true, historicalLayers: true }}
            scrollWheelZoom
            zoom={6}
            dragging
          />
        </div>
        <div className="basis-1/2 min-w-0 flex flex-col gap-2">
          <TextField value={query} onChange={setQuery}>
            <InputGroup>
              <InputGroup.Input placeholder="Пошук автора" />
              {query ? (
                <InputGroup.Suffix>
                  <CloseButton aria-label="Очистити пошук" onPress={() => setQuery("")} />
                </InputGroup.Suffix>
              ) : null}
            </InputGroup>
          </TextField>
          <InspectorDuckTable<PublicAuthor>
            id="authors-table"
            isLoading={isLoading}
            rows={authors ?? []}
            onRowClicked={(event) => event.data && focusOnMap(event.data)}
            columns={[
              {
                headerName: "Автори",
                field: "title",
                flex: 1,
                sortable: false,
                filter: false,
                resizable: false,
                cellRenderer: (row: { data: PublicAuthor }) => (
                  <div className="flex justify-between gap-2 w-full py-2">
                    <div className="flex flex-col gap-1 min-w-0 grow">
                      <span className="text-base leading-tight font-bold">{row.data.title}</span>
                      {row.data.info ? <span className="text-sm opacity-70">{row.data.info}</span> : null}
                      <div className="flex flex-wrap items-center gap-1">
                        {row.data.tags.map((tag) => (
                          <Chip key={tag} size="sm" variant="soft">
                            {tag}
                          </Chip>
                        ))}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        aria-label="Знайти справи цього автора"
                        onPress={() => handleSearch(row.data)}
                      >
                        <FaSearch />
                        {row.data._count.file_authors}
                      </Button>
                      {/* Proposals need an account to attribute them to — same rule as the record report button. */}
                      {status === "authenticated" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          isIconOnly
                          aria-label="Повідомити про помилку"
                          onPress={() => setReported(row.data)}
                        >
                          <FaBug />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </div>
      <AuthorReportModal author={reported} isOpen={Boolean(reported)} onClose={() => setReported(null)} />
    </>
  );
};

export default AuthorsTable;
