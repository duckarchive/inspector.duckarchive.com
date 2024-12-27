import { FamilySearchPlace } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";

export type FamilySearchPlaceRequest = Record<FamilySearchPlace["id"], FamilySearchPlace["total_count"]>;

export type FamilySearchPlaceResponse = FamilySearchPlace[] | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<FamilySearchPlaceResponse>) {
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }
  const user = await authorizeGoogle(req, true);
  if (!user) {
    res.status(401).end();
    return;
  }
  if (req.method === "GET") {
    const places: FamilySearchPlace[] = await prisma.familySearchPlace.findMany();
    res.status(200).json(places);
  }

  if (req.method === "PATCH") {
    const places = req.body as FamilySearchPlaceRequest;
    if (!places || !Object.keys(places).length) {
      res.status(400).json({ error: 'places list is required' });
      return;
    }

    for (const id in places) {
      const total_count = places[id];
      await prisma.familySearchPlace.update({
        where: { id: Number(id) },
        data: { total_count },
      });
    }

    res.status(200).end();
  }
}
