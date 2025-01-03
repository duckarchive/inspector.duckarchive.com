import { FamilySearchProject, Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/db";
import { authorizeGoogle } from "@/lib/auth";

export type FamilySearchProjectRequest = Record<FamilySearchProject["id"], FamilySearchProject["children_count"]>;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
        }
      }
    });
    res.status(200).json(projects);
  }

  if (req.method === "POST") {
    const projects = req.body as FamilySearchProjectRequest;
    if (!projects || !Object.keys(projects).length) {
      res.status(400).json({ error: "projects list is required" });
      return;
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
        }
      }
    });

    res.status(200).json(freshProjects);
  }

  if (req.method === "PATCH") {
    const projects = req.body as FamilySearchProjectRequest;
    if (!projects || !Object.keys(projects).length) {
      res.status(400).json({ error: "projects list is required" });
      return;
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
        res.status(400).json({ error: `project ${id} not found` });
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
        }
      }
    });

    res.status(200).json(freshProjects);
  }
}
