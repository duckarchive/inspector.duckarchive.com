import { FamilySearchProject, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";
import { ErrorResponse } from "@/types";

export type FamilySearchProjectRequest = Record<FamilySearchProject["id"], FamilySearchProject["children_count"]>;

export type GetFamilySearchProjectResponse =
  | Prisma.FamilySearchProjectGetPayload<{
      select: {
        id: true;
        children_count: true;
        prev_children_count: true;
        updated_at: true;
        archive: {
          select: {
            id: true;
            code: true;
          };
        };
      };
    }>[]
  | ErrorResponse;

export async function GET(req: NextRequest): Promise<NextResponse<GetFamilySearchProjectResponse>> {
  const user = await authorizeGoogle(req, true);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const projects = await prisma.familySearchProject.findMany({
    where: {
      archive_id: {
        not: null,
      },
    },
    select: {
      id: true,
      children_count: true,
      prev_children_count: true,
      updated_at: true,
      archive: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest): Promise<NextResponse<GetFamilySearchProjectResponse>> {
  const user = await authorizeGoogle(req, true);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const projects: FamilySearchProjectRequest = await req.json();

  if (!projects || !Object.keys(projects).length) {
    return NextResponse.json({ message: "projects list is required" }, { status: 400 });
  }

  const existingProjects = await prisma.familySearchProject.findMany();
  const ids: Record<string, boolean> = {};
  existingProjects.forEach((project) => {
    ids[project.id] = true;
  });

  const newProjects = Object.entries(projects).filter(([id]) => !ids[id]);

  for (const [id, children_count] of newProjects) {
    await prisma.familySearchProject.create({
      data: { id, children_count },
    });
  }

  const freshProjects = await prisma.familySearchProject.findMany({
    where: {
      archive_id: {
        not: null,
      },
    },
    select: {
      id: true,
      children_count: true,
      prev_children_count: true,
      updated_at: true,
      archive: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });

  return NextResponse.json(freshProjects);
}

export async function PATCH(req: NextRequest): Promise<NextResponse<GetFamilySearchProjectResponse>> {
  const user = await authorizeGoogle(req, true);
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  const projects: FamilySearchProjectRequest = await req.json();
  if (!projects || !Object.keys(projects).length) {
    return NextResponse.json({ message: "projects list is required" }, { status: 400 });
  }

  const existingProjects = await prisma.familySearchProject.findMany();
  const existingProjectsHash: Record<string, FamilySearchProject> = {};
  existingProjects.forEach((project) => {
    existingProjectsHash[project.id] = project;
  });

  for (const [id, count] of Object.entries(projects)) {
    if (existingProjectsHash[id]) {
      const { prev_children_count, children_count } = existingProjectsHash[id];

      await prisma.familySearchProject.update({
        where: { id },
        data: {
          children_count: count,
          prev_children_count: prev_children_count === children_count ? children_count : prev_children_count,
        },
      });
    } else {
      return NextResponse.json({ message: `project ${id} not found` }, { status: 400 });
    }
  }

  const freshProjects = await prisma.familySearchProject.findMany({
    where: {
      archive_id: {
        not: null,
      },
    },
    select: {
      id: true,
      children_count: true,
      prev_children_count: true,
      updated_at: true,
      archive: {
        select: {
          id: true,
          code: true,
        },
      },
    },
  });

  return NextResponse.json(freshProjects);
}
