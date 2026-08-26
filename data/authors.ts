import prisma from "@/lib/db";

export type MapAuthor = {
  id: string;
  title: string;
  lat: number | null;
  lng: number | null;
  tags: string[];
};

/**
 * Just enough to plot every geocoded author. The list beside the map is fed by
 * /api/authors instead: all ~17k authors with their descriptions and link
 * counts serialize to several MB, which is not worth putting in the page
 * payload when the table shows 200 at a time.
 */
export const getMapAuthors = async (): Promise<MapAuthor[]> =>
  prisma.author.findMany({
    select: {
      id: true,
      lat: true,
      lng: true,
      title: true,
      tags: true,
    },
    where: {
      lat: { not: null },
      lng: { not: null },
    },
  });
