import groupBy from "lodash/groupBy.js";
import prisma from "../lib/db";
import { Archive, Case, Description, Fund, Match } from "@prisma/client";

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
  code: Archive["code"];
  count: number;
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

  const updatedMatchesInDateRange: Report = await prisma.$queryRaw`
    with
      latest_rows as
        (
          select match_id, count, created_at, row_number() over (partition by match_id order by created_at desc) as rn
          from match_results
          where created_at >= ${from}::timestamp and created_at < ${to}::timestamp
      ),
      previous_rows as
        (
          select match_id, count, created_at
          from match_results
          where (match_id, created_at) in
              (
            select match_id, max(created_at)
            from match_results
            where created_at < ${from}::timestamp
            group by match_id
          )
      )
    select m.id,
          m.updated_at,
          m.resource_id,
          a.code as archive_code,
          f.code as fund_code,
          d.code as description_code,
          c.code as case_code,
          m.children_count,
          lr.count as last_count,
          pr.count as prev_count,
          m.url,
          case
            when (pr.count = 0 or pr.count is null) and m.children_count > 0 then true
            else false
          end as is_online
    from latest_rows lr
    join matches m on lr.match_id = m.id
    left join previous_rows pr on m.id = pr.match_id
    left join archives a on m.archive_id = a.id
    left join funds f on m.fund_id = f.id
    left join descriptions d on m.description_id = d.id
    left join cases c on m.case_id = c.id
    where lr.rn = 1
      and (
        (pr.count is null and m.children_count > 0) or
        (pr.count = 0 and m.children_count > 0) or
        (pr.count > 0 and m.children_count = 0)
      );
  `;

  const groupedByArchive = Object.entries(groupBy(updatedMatchesInDateRange, "archive_code")).map(([code, rows]) => ({
    code,
    count: rows.length,
  }));

  const limitedReport = updatedMatchesInDateRange.slice(0, 10000);

  return [limitedReport, groupedByArchive];
};