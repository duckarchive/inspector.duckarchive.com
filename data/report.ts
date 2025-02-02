import fs from "fs/promises";
import groupBy from "lodash/groupBy.js";
import prisma from "../lib/db";
import { Archive, Case, DailyStat, Description, Fund, Match } from "@prisma/client";

process.env.TZ = "UTC";

export type Report = {
  id: Match["id"];
  updated_at: Match["updated_at"];
  resource_id: Match["resource_id"];
  archive_code: Archive["code"];
  fund_code: Fund["code"];
  description_code: Description["code"];
  case_code: Case["code"];
  children_count: Match["children_count"];
  url: Match["url"];
  is_online: boolean;
}[];

export type ReportSummary = {
  archive_code: Archive["code"];
  funds: {
    fund_code: Fund["code"];
    count: number;
  }[];
}[];

export const getYesterdayReport = async (): Promise<[Report, ReportSummary]> => {
  // start of yesterday using date-fns
  const startOfYesterday = new Date();
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);
  startOfYesterday.setHours(0, 0, 0, 0);
  const from = startOfYesterday.toISOString();
  // end of yesterday using date-fns
  // const endOfYesterday = new Date();
  // endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  // endOfYesterday.setHours(23, 59, 59, 999);
  // const to = endOfYesterday.toISOString();

  const updatedMatches = await prisma.match.findMany({
    where: {
      case_id: {
        not: null,
      },
      updated_at: {
        gte: from,
        // lt: to,
      },
      OR: [{
        prev_children_count: {
          not: null
        },
        children_count: {
          gt: prisma.match.fields.prev_children_count
        }
      }, {
        prev_children_count: null,
        children_count: {
          gt: 0
        }
      }]
    },
    select: {
      id: true,
      updated_at: true,
      resource_id: true,
      archive: {
        select: {
          code: true,
        },
      },
      fund: {
        select: {
          code: true,
        },
      },
      description: {
        select: {
          code: true,
        },
      },
      case: {
        select: {
          code: true,
        },
      },
      children_count: true,
      url: true,
    },
  });

  const report: Report = updatedMatches.map((match) => ({
    id: match.id,
    updated_at: match.updated_at,
    resource_id: match.resource_id,
    archive_code: match.archive?.code || "",
    fund_code: match.fund?.code || "",
    description_code: match.description?.code || "",
    case_code: match.case?.code || "",
    children_count: match.children_count,
    url: match.url,
    is_online: Boolean(match?.children_count),
  }));

  // const groupedByArchive = Object.entries(groupBy(report, "archive_code")).map(([code, rows]) => ({
  //   code,
  //   count: rows.length,
  // }));

  const groupedByFunds = Object.entries(groupBy(report, "archive_code")).map(([archive_code, funds]) => ({
    archive_code,
    funds: Object.entries(groupBy(funds, "fund_code")).map(([fund_code, rows]) => ({
      fund_code,
      count: rows.length
    })),
  }));

  if (process.env.SEND_NOTIFICATION === "true") {
    await fs.writeFile("_notification.json", JSON.stringify(groupedByFunds, null, 2));
  }

  const limitedReport = report.slice(0, 25000);

  return [limitedReport, groupedByFunds];
};

export interface DailyStatWithArchive extends DailyStat {
  archive: Archive;
}

export const getDailyStats = async (): Promise<DailyStatWithArchive[]> => {
  const startOfOneMonthAgo = new Date();
  startOfOneMonthAgo.setMonth(startOfOneMonthAgo.getMonth() - 1);
  startOfOneMonthAgo.setHours(0, 0, 0, 0);
  const from = startOfOneMonthAgo.toISOString();
  // const startOfToday = new Date();
  // startOfToday.setHours(0, 0, 0, 0);
  // const to = startOfToday.toISOString();

  const stats = await prisma.dailyStat.findMany({
    where: {
      created_at: {
        gte: from,
        // lt: to,
      },
    },
    orderBy: {
      created_at: "asc",
    },
    include: {
      archive: true,
    }
  });

  return stats;
};
