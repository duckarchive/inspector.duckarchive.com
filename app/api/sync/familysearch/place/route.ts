import { FamilySearchPlace } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";
import { ErrorResponse } from "@/types";

export type FamilySearchPlaceRequest = Record<FamilySearchPlace["id"], FamilySearchPlace["total_count"]>;

export type GetFamilySearchPlaceResponse = FamilySearchPlace[];

export async function GET(req: NextRequest): Promise<NextResponse<GetFamilySearchPlaceResponse | ErrorResponse>> {
  const user = await authorizeGoogle(req, true);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const places: FamilySearchPlace[] = await prisma.familySearchPlace.findMany();
  return NextResponse.json(places);
}

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const places: FamilySearchPlaceRequest = await req.json();
  if (!places || !Object.keys(places).length) {
    return NextResponse.json({ message: "places list is required" }, { status: 400 });
  }

  for (const id in places) {
    const total_count = places[id];
    await prisma.familySearchPlace.update({
      where: { id: Number(id) },
      data: { total_count },
    });
  }

  return NextResponse.json(true);
}
