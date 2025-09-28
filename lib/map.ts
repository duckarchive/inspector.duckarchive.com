import { Author, CaseLocation } from "@/generated/prisma/client";
import { MarkerValue } from "@duckarchive/map/dist/LocationMarker";

// Function to slightly randomize coordinates if overlap found
export const randomizeCoordinates = (positions: MarkerValue[]): MarkerValue[] => {
  const grouped = new Map<string, MarkerValue[]>();

  // Group positions by identical coordinates
  positions.forEach((pos) => {
    const [lat, lng] = pos;
    const key = `${lat},${lng}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(pos);
  });

  const randomizedPositions: MarkerValue[] = [];

  grouped.forEach((group, key) => {
    if (group.length === 1) {
      randomizedPositions.push(group[0]);
    } else {
      // Spread duplicates in a circle
      const [lat, lng] = group[0];
      const radius = 0.0005; // adjust for spacing
      group.forEach((pos, i) => {
        const angle = (2 * Math.PI * i) / group.length;
        const newLat = lat + radius * Math.cos(angle);
        const newLng = lng + radius * Math.sin(angle);
        randomizedPositions.push([newLat, newLng, ...pos.slice(2)] as MarkerValue);
      });
    }
  });

  return randomizedPositions;
};

const tag2icon: Record<string, string> = {
  "православ'я": "christChurchIcon",
  "римо-католицизм": "christChurchIcon",
  іудаїзм: "jewChurchIcon",
};

export const prepareLocations = (
  locations: (Pick<Author, "lat" | "lng" | "title" | "tags"> | Pick<CaseLocation, "lat" | "lng" | "radius_m">)[]
): MarkerValue[] => {
  const markers: MarkerValue[] = locations.map(({ lat, lng, ...rest }) => {
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
  locations: (Pick<Author, "lat" | "lng"> | Pick<CaseLocation, "lat" | "lng">)[]
): [number, number] => {
  if (locations.length === 0) return [0, 0];
  const validLocations = locations.filter((loc) => loc.lat !== null && loc.lng !== null);
  if (validLocations.length === 0) return [0, 0];
  const latSum = validLocations.reduce((sum, loc) => sum + loc.lat!, 0);
  const lngSum = validLocations.reduce((sum, loc) => sum + loc.lng!, 0);
  return [latSum / validLocations.length, lngSum / validLocations.length];
};
