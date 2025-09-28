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
