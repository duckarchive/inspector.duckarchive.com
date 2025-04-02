import { Prisma } from "@prisma/client";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { ErrorResponse } from "@/types";

export type GetArchiveResponse =
  | Prisma.ArchiveGetPayload<{
      include: {
        funds: {
          select: {
            id: true;
            code: true;
            title: true;
            matches: {
              select: {
                updated_at: true;
                children_count: true;
                resource_id: true;
              };
            };
          };
        };
      };
    }>;

interface GetArchiveParams {
  params: Promise<{
    "archive-code": string;
  }>;
}

export async function GET(_req: NextRequest, props: GetArchiveParams): Promise<NextResponse<GetArchiveResponse | ErrorResponse>> {
  const params = await props.params;
  const archiveCode = params["archive-code"];

  if (!archiveCode) {
    return NextResponse.json({ message: '"archive-code" query param is required' }, { status: 400 });
  }

  const archive = await prisma.archive.findFirst({
    where: {
      code: archiveCode,
    },
    include: {
      funds: {
        select: {
          id: true,
          code: true,
          title: true,
          matches: {
            where: {
              description_id: null,
              case_id: null,
            },
            select: {
              updated_at: true,
              children_count: true,
              resource_id: true,
            },
          },
        },
      },
    },
  });
  if (archive) {
    return NextResponse.json(archive, { status: 200 });
  } else {
    return NextResponse.json({ message: "Archive not found" }, { status: 404 });
  }
}
