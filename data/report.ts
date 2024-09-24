import fs from "fs/promises";
import groupBy from "lodash/groupBy.js";
import prisma from "../lib/db";
import { Archive, Case, Description, Fund, Match, MatchResult } from "@prisma/client";
import chunk from "lodash/chunk.js";

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
  const endOfYesterday = new Date();
  endOfYesterday.setDate(endOfYesterday.getDate() - 1);
  endOfYesterday.setHours(23, 59, 59, 999);
  const to = endOfYesterday.toISOString();

  let prevMatchResults: MatchResult[] = await prisma.$queryRaw`
    with
      prev_match_results as (
        select match_id, count, created_at, row_number() over (partition by match_id order by created_at desc) as rn
        from match_results
        where created_at < ${from}::timestamp and error is null
      )
    select
      pmr.created_at,
      pmr.match_id,
      pmr.count
    from prev_match_results pmr
    where pmr.rn = 1;
  `;

  const prevMatchResultsHash: Record<MatchResult["match_id"], MatchResult["count"]> = {};

  prevMatchResults.forEach((result) => {
    prevMatchResultsHash[result.match_id] = result.count;
  });

  // garbage collection
  prevMatchResults = null as any;

  let lastMatchResults: MatchResult[] = await prisma.$queryRaw`
    with
      last_match_results as (
        select match_id, count, created_at, row_number() over (partition by match_id order by created_at desc) as rn
        from match_results
        where created_at >= ${from}::timestamp and created_at < ${to}::timestamp and error is null
      )
    select 
      lmr.created_at,
      lmr.match_id,
      lmr.count
    from last_match_results lmr
    where lmr.rn = 1;
  `;

  const updatedMatchResultsHash: Record<MatchResult["match_id"], boolean> = {};

  const updatedMatchResults = lastMatchResults.filter((result) => {
    const prevCount = prevMatchResultsHash[result.match_id] || 0;
    if (prevCount !== result.count) {
      updatedMatchResultsHash[result.match_id] = result.count > prevCount;
      return true;
    }
  });

  // garbage collection
  lastMatchResults = null as any;

  const updatedMatchResultIds = updatedMatchResults.map((result) => result.match_id);
  const updatedMatchResultIdsChunks = chunk(updatedMatchResultIds, 1000);

  let updatedMatches: any[] = [];
  for (const updatedMatchResultIdsChunk of updatedMatchResultIdsChunks) {
    
    const dbMatches = await prisma.match.findMany({
      where: {
        id: {
          in: updatedMatchResultIdsChunk,
        },
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

    updatedMatches = updatedMatches.concat(dbMatches);
  }

  const report = updatedMatches.map((match) => ({
    id: match.id,
    updated_at: match.updated_at,
    resource_id: match.resource_id,
    archive_code: match.archive.code,
    fund_code: match.fund.code,
    description_code: match.description.code,
    case_code: match.case.code,
    children_count: match.children_count,
    url: match.url,
    is_online: updatedMatchResultsHash[match.id],
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

  const limitedReport = report.slice(0, 10000);

  return [limitedReport, groupedByFunds];
};
