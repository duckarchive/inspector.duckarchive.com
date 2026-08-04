import { Author, CaseLocation } from "@generated/prisma/client/client";
import type { GeoDuckMapProps } from "@duckarchive/map";

/** Golden angle ≈ 137.5° — sunflower-seed packing, uniform in every direction. */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
/** ~35 m between neighbouring markers — separable at max zoom. */
const SPACING_DEG = 0.00032;

/**
 * Spread markers that share identical coordinates (e.g. all churches geocoded to
 * one settlement) over a phyllotaxis disc: point i sits at radius ∝ √i along the
 * golden-angle spiral, so neighbour spacing stays ~constant however large the
 * group is — a fixed circle packed N points on its rim and became unreadable.
 * The first point keeps the exact original position; longitude offsets are
 * cos(lat)-corrected so the disc stays round.
 */
export const randomizeCoordinates = (positions: GeoDuckMapProps["positions"]): GeoDuckMapProps["positions"] => {
  const grouped = new Map<string, GeoDuckMapProps["positions"]>();

  positions.forEach((pos) => {
    const [lat, lng] = pos;
    const key = `${lat},${lng}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(pos);
  });

  const randomizedPositions: GeoDuckMapProps["positions"] = [];

  grouped.forEach((group) => {
    if (group.length === 1) {
      randomizedPositions.push(group[0]);
      return;
    }
    const [lat, lng] = group[0];
    const lngScale = 1 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    group.forEach((pos, i) => {
      const radius = SPACING_DEG * Math.sqrt(i); // i = 0 → the true location
      const angle = i * GOLDEN_ANGLE;
      const newLat = lat + radius * Math.cos(angle);
      const newLng = lng + radius * Math.sin(angle) * lngScale;
      randomizedPositions.push([newLat, newLng, ...pos.slice(2)] as GeoDuckMapProps["positions"][number]);
    });
  });

  return randomizedPositions;
};

const tag2icon: Record<string, string> = {
  "православ'я": "orthodoxCrossIcon",
  "римо-католицизм": "latinCrossIcon",
  "греко-католицизм": "patriarchalCrossIcon",
  реформаторство: "huguenotCrossIcon",
  іудаїзм: "davidStarIcon",
  лютеранство: "lutherRoseIcon",
  протестантизм: "christianCrossIcon",
  баптизм: "christianCrossIcon",
  євангелізм: "christianCrossIcon",
  "цивільний стан": "buildingIcon",
};

export const prepareLocations = (
  locations: (Pick<Author, "lat" | "lng" | "title" | "tags"> | Pick<CaseLocation, "lat" | "lng" | "radius_m">)[],
): GeoDuckMapProps["positions"] => {
  const markers: GeoDuckMapProps["positions"] = locations.map(({ lat, lng, ...rest }) => {
    const latitude = lat || 0;
    const longitude = lng || 0;
    const radius = "radius_m" in rest ? rest.radius_m : 0;
    const title = "title" in rest ? rest.title : undefined;
    let iconName: string | undefined = undefined;
    if ("tags" in rest) {
      const iconTag = rest.tags.find((tag) => tag in tag2icon);
      iconName = iconTag ? tag2icon[iconTag] : undefined;
    }
    return [latitude, longitude, radius, title, iconName];
  });
  return randomizeCoordinates(markers);
};

export const findCenter = (
  locations: (Pick<Author, "lat" | "lng"> | Pick<CaseLocation, "lat" | "lng">)[],
): [number, number] => {
  if (locations.length === 0) return [0, 0];
  const validLocations = locations.filter((loc) => loc.lat !== null && loc.lng !== null);
  if (validLocations.length === 0) return [0, 0];
  const latSum = validLocations.reduce((sum, loc) => sum + loc.lat!, 0);
  const lngSum = validLocations.reduce((sum, loc) => sum + loc.lng!, 0);
  return [latSum / validLocations.length, lngSum / validLocations.length];
};

export const parseMapLinkUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url.trim());
    let lat: number | undefined;
    let lng: number | undefined;

    if (parsedUrl.hostname.includes("google.com")) {
      // Google Maps URL formats:
      // https://www.google.com/maps/@37.4219999,-122.0840575,15z
      // https://www.google.com/maps/place/PLACE_DATA/@50.1852305,27.5629519,13z
      // https://www.google.com/maps/place/37°25'19.2"N+122°05'02.6"W/
      const pathMatch = parsedUrl.pathname.match(/@([-.\d]+),([-.\d]+)/);
      if (pathMatch) {
        lat = parseFloat(pathMatch[1]);
        lng = parseFloat(pathMatch[2]);
      } else {
        const placeMatch = parsedUrl.pathname.match(/place\/([-.\d]+)[°\s]*([NS])\s*([-.\d]+)[°\s]*([EW])/);
        if (placeMatch) {
          lat = parseFloat(placeMatch[1]) * (placeMatch[2] === "N" ? 1 : -1);
          lng = parseFloat(placeMatch[3]) * (placeMatch[4] === "E" ? 1 : -1);
        }
      }
    } else if (parsedUrl.hostname.includes("openstreetmap.org")) {
      // OpenStreetMap URL format:
      // https://www.openstreetmap.org/?mlat=37.4219999&mlon=-122.0840575#map=15/37.4219999/-122.0840575
      const latParam = parsedUrl.searchParams.get("mlat");
      const lonParam = parsedUrl.searchParams.get("mlon");
      if (latParam && lonParam) {
        lat = parseFloat(latParam);
        lng = parseFloat(lonParam);
      } else {
        const hashMatch = parsedUrl.hash.match(/#map=\d+\/([-.\d]+)\/([-.\d]+)/);
        if (hashMatch) {
          lat = parseFloat(hashMatch[1]);
          lng = parseFloat(hashMatch[2]);
        }
      }
    } else if (parsedUrl.hostname.includes("toolforge.org")) {
      // https://geohack.toolforge.org/geohack.php?language=uk&pagename=%D0%9F%D0%BE%D0%BD%D1%96%D0%BD%D0%BA%D0%B0&params=50_11_7_N_27_33_49_E_scale:30000
      const params = parsedUrl.searchParams.get("params");
      if (params) {
        const match = params.match(/(\d+)_(\d+)_(\d+)_([NS])_(\d+)_(\d+)_(\d+)_?([EW])/);
        console.log("Toolforge match:", params, match);
        if (match) {
          const latDeg = parseFloat(match[1]);
          const latMin = parseFloat(match[2]);
          const latSec = parseFloat(match[3]);
          const latDir = match[4];
          const lonDeg = parseFloat(match[5]);
          const lonMin = parseFloat(match[6]);
          const lonSec = parseFloat(match[7]);
          const lonDir = match[8];
          lat = latDeg + latMin / 60 + latSec / 3600;
          if (latDir === "S") lat = -lat;
          lng = lonDeg + lonMin / 60 + lonSec / 3600;
          if (lonDir === "W") lng = -lng;
        }
      }
    }

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
    return null;
  } catch (err) {
    console.error("Failed to parse map link URL:", err);
    return null;
  }
};
