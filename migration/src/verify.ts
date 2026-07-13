import { PoolClient } from 'pg';

import { ArchiveRow, Stats } from './entities';
import { ArchiveReport } from './report';

const one = async (client: PoolClient, sql: string, params: unknown[] = []): Promise<number> =>
  (await client.query(sql, params)).rows[0].n as number;

export const verifyArchive = async (
  client: PoolClient,
  archive: ArchiveRow,
  report: ArchiveReport,
  stats: Stats,
): Promise<string[]> => {
  const problems: string[] = [];

  const legacy = {
    funds: await one(client, 'SELECT count(*)::int AS n FROM funds WHERE archive_id = $1', [archive.id]),
    descs: await one(client, 'SELECT count(*)::int AS n FROM descriptions d JOIN funds f ON d.fund_id = f.id WHERE f.archive_id = $1', [archive.id]),
    cases: await one(client, 'SELECT count(*)::int AS n FROM cases c JOIN descriptions d ON c.description_id = d.id JOIN funds f ON d.fund_id = f.id WHERE f.archive_id = $1', [archive.id]),
  };
  const mapped = {
    funds: await one(client, 'SELECT count(*)::int AS n FROM mig_fund_map'),
    descs: await one(client, 'SELECT count(*)::int AS n FROM mig_desc_map'),
    cases: await one(client, 'SELECT count(*)::int AS n FROM mig_case_map'),
  };

  // every legacy row is either mapped or explicitly skipped
  const expectFunds = legacy.funds - (stats.fund_empty_code_skipped ?? 0);
  const expectDescs = legacy.descs - (stats.descriptions_skipped ?? 0) - (stats.description_empty_code_skipped ?? 0);
  const expectCases = legacy.cases - (stats.cases_skipped_with_parent ?? 0) - (stats.case_empty_code_skipped ?? 0);
  if (mapped.funds !== expectFunds) problems.push(`fund map ${mapped.funds} ≠ expected ${expectFunds}`);
  if (mapped.descs !== expectDescs) problems.push(`description map ${mapped.descs} ≠ expected ${expectDescs}`);
  if (mapped.cases !== expectCases) problems.push(`case map ${mapped.cases} ≠ expected ${expectCases}`);

  // uniqueness of full_code inside the archive
  const dupFullCodes = await one(client, `
    SELECT count(*)::int AS n FROM (
      SELECT f.full_code FROM files f
      JOIN inventories i ON f.inventory_id = i.id
      JOIN fonds fo ON i.fond_id = fo.id
      WHERE fo.archive_id = $1
      GROUP BY f.full_code HAVING count(*) > 1
    ) t`, [archive.id]);
  if (dupFullCodes > 0) problems.push(`${dupFullCodes} duplicated full_codes among archive files`);

  // Attach-completeness, NOT import-completeness: new copy tables are scraper-owned, so a legacy
  // copy with no scraped counterpart at its url is expected to stay absent (informational stat
  // below), not a problem. Only flag urls where a scraped row DOES exist but the attach steps
  // (A0-A2, C) left every row at that url unattached — a genuine miss, not a legit no-scrape case.
  const missingCopies = await one(client, `
    SELECT count(DISTINCT oc.url)::int AS n FROM mig_old_copies oc
    WHERE EXISTS (SELECT 1 FROM file_online_copies foc WHERE foc.url = oc.url)
      AND NOT EXISTS (SELECT 1 FROM file_online_copies foc WHERE foc.url = oc.url AND foc.file_id IS NOT NULL)
  `);
  if (missingCopies > 0) problems.push(`${missingCopies} legacy online-copy urls have a scraped counterpart that was never attached`);

  // satellite parity (target must have at least as many as legacy maps produce)
  const legacyYears = await one(client, 'SELECT count(DISTINCT (m.file_id, y.start_year, y.end_year))::int AS n FROM case_years y JOIN mig_case_map m USING (case_id)');
  const fileYears = await one(client, 'SELECT count(*)::int AS n FROM file_years fy WHERE EXISTS (SELECT 1 FROM mig_case_map m WHERE m.file_id = fy.file_id)');
  if (fileYears < legacyYears) problems.push(`file_years ${fileYears} < expected ${legacyYears}`);

  report.section('Verification', [
    `| metric | legacy | mapped/expected |`,
    `|---|---|---|`,
    `| funds | ${legacy.funds} | ${mapped.funds} / ${expectFunds} |`,
    `| descriptions | ${legacy.descs} | ${mapped.descs} / ${expectDescs} |`,
    `| cases | ${legacy.cases} | ${mapped.cases} / ${expectCases} |`,
    ``,
    problems.length ? `**PROBLEMS:**\n${problems.map((p) => `- ${p}`).join('\n')}` : '✅ all checks passed',
  ]);

  return problems;
};
