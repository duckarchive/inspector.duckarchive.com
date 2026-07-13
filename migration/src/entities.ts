import { randomUUID } from 'node:crypto';
import { PoolClient } from 'pg';

import { insertMany } from './db';
import {
  analyzeSequence,
  canonicalizeCode,
  isRegularCode,
  Level,
  SKIP_CODES,
} from './normalize';
import { ArchiveReport } from './report';

export interface ArchiveRow {
  id: string;
  code: string;
}

export type Stats = Record<string, number>;

interface LegacyRow {
  id: string;
  code: string;
  title: string | null;
  info: string | null;
  updated_at: Date | null;
  tags?: string[] | null;
}

interface TargetRow {
  id: string;
  code: string;
  title: string | null;
  info: string | null;
}

const bump = (stats: Stats, key: string, by = 1): void => {
  stats[key] = (stats[key] ?? 0) + by;
};

const hasText = (s: string | null | undefined): s is string => !!s && s.trim().length > 0;

/** newest updated_at wins; prefer rows that actually have a title */
const pickPrimary = <T extends LegacyRow>(rows: T[]): T =>
  [...rows].sort((a, b) => {
    if (hasText(a.title) !== hasText(b.title)) return hasText(a.title) ? -1 : 1;
    return (b.updated_at?.getTime() ?? 0) - (a.updated_at?.getTime() ?? 0);
  })[0];

/** canonical code → target rows; collisions inside the target itself are logged, first row wins */
const indexTargets = (
  rows: TargetRow[],
  level: Level,
  report: ArchiveReport,
): Map<string, TargetRow> => {
  const map = new Map<string, TargetRow>();
  for (const row of rows) {
    const canon = canonicalizeCode(row.code, level);
    const prev = map.get(canon);
    if (prev) {
      report.anomaly('target-collision', level, row.id, `target codes "${prev.code}" and "${row.code}" both → ${canon}`);
    } else {
      map.set(canon, row);
    }
  }
  return map;
};

/** group legacy rows by canonical code; log merge groups and junk shapes */
const groupByCanon = <T extends LegacyRow>(
  rows: T[],
  level: Level,
  parentRef: string,
  report: ArchiveReport,
  stats: Stats,
): Map<string, T[]> => {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const canon = canonicalizeCode(row.code, level);
    if (level === 'description' && SKIP_CODES.has(canon)) {
      report.anomaly('skipped', level, `${parentRef}/${row.code}`, `skip-listed code (${canon}); children skipped too`);
      bump(stats, 'descriptions_skipped');
      continue;
    }
    if (!canon) {
      report.anomaly('junk-code', level, `${parentRef}/${row.id}`, `code "${row.code}" canonicalizes to empty — skipped`);
      bump(stats, `${level}_empty_code_skipped`);
      continue;
    }
    if (!isRegularCode(canon)) {
      report.anomaly('junk-code', level, `${parentRef}/${row.code}`, `irregular shape, migrated as "${canon}"`);
    }
    if (canon !== row.code) bump(stats, `${level}_code_rewritten`);
    const group = groups.get(canon);
    if (group) group.push(row);
    else groups.set(canon, [row]);
  }
  for (const [canon, group] of groups) {
    if (group.length > 1) {
      report.anomaly('merge', level, `${parentRef}/${canon}`, `merged variants: ${group.map((r) => r.code).join(' + ')}`);
      bump(stats, `${level}_merged_variants`, group.length - 1);
    }
  }
  return groups;
};

const fillMissingText = async (
  client: PoolClient,
  table: string,
  fills: [id: string, title: string | null, info: string | null][],
): Promise<void> => {
  for (const [id, title, info] of fills) {
    await client.query(
      `UPDATE ${table} SET
         title = CASE WHEN COALESCE(title, '') = '' THEN $2 ELSE title END,
         info  = CASE WHEN COALESCE(info, '')  = '' THEN $3 ELSE info  END
       WHERE id = $1`,
      [id, title, info],
    );
  }
};

export const migrateEntities = async (
  client: PoolClient,
  archive: ArchiveRow,
  report: ArchiveReport,
  stats: Stats,
): Promise<void> => {
  await client.query(`
    CREATE TEMP TABLE mig_fund_map (fund_id uuid PRIMARY KEY, fond_id uuid NOT NULL) ON COMMIT DROP;
    CREATE TEMP TABLE mig_desc_map (description_id uuid PRIMARY KEY, inventory_id uuid NOT NULL) ON COMMIT DROP;
    CREATE TEMP TABLE mig_case_map (case_id uuid PRIMARY KEY, file_id uuid NOT NULL) ON COMMIT DROP;
  `);

  // ---------- fonds ----------
  const targetFonds = await client.query<TargetRow>(
    'SELECT id, code, title, info FROM fonds WHERE archive_id = $1',
    [archive.id],
  );
  const fondByCanon = indexTargets(targetFonds.rows, 'fund', report);

  const legacyFunds = await client.query<LegacyRow>(
    'SELECT id, code, title, info, updated_at FROM funds WHERE archive_id = $1',
    [archive.id],
  );
  const fundGroups = groupByCanon(legacyFunds.rows, 'fund', archive.code, report, stats);

  const fundSeq = analyzeSequence([...fundGroups.keys()]);
  if (fundSeq.missingCount > 0) {
    report.anomaly('sequence-gap', 'fund', archive.code, `${fundSeq.missingCount} missing in ${fundSeq.min}..${fundSeq.max}: ${fundSeq.gaps}`);
  }

  const newFondRows: unknown[][] = [];
  const fondFills: [string, string | null, string | null][] = [];
  const fundMapRows: unknown[][] = [];
  const fondStoredCode = new Map<string, string>(); // fond_id → stored code
  const fondLegacyFundIds = new Map<string, string[]>(); // fond_id → legacy fund ids

  for (const [canon, group] of fundGroups) {
    const primary = pickPrimary(group);
    const existing = fondByCanon.get(canon);
    let fondId: string;
    if (existing) {
      fondId = existing.id;
      fondStoredCode.set(fondId, existing.code);
      if ((!hasText(existing.title) && hasText(primary.title)) || (!hasText(existing.info) && hasText(primary.info))) {
        fondFills.push([fondId, primary.title, primary.info]);
      }
      if (existing.code !== canon) {
        report.anomaly('code-diff', 'fund', `${archive.code}/${canon}`, `kept existing fond code "${existing.code}"`);
      }
      bump(stats, 'fonds_matched');
    } else {
      fondId = randomUUID();
      fondStoredCode.set(fondId, canon);
      newFondRows.push([fondId, canon, primary.title, primary.info, archive.id, primary.updated_at]);
      bump(stats, 'fonds_created');
    }
    fundMapRows.push(...group.map((f) => [f.id, fondId]));
    fondLegacyFundIds.set(fondId, [...(fondLegacyFundIds.get(fondId) ?? []), ...group.map((f) => f.id)]);
  }

  await insertMany(client, 'fonds', ['id', 'code', 'title', 'info', 'archive_id', 'updated_at'], newFondRows, '');
  await fillMissingText(client, 'fonds', fondFills);
  await insertMany(client, 'mig_fund_map', ['fund_id', 'fond_id'], fundMapRows, '');

  // ---------- inventories ----------
  const targetInvs = await client.query<TargetRow & { fond_id: string }>(
    `SELECT i.id, i.code, i.title, i.info, i.fond_id
     FROM inventories i JOIN fonds fo ON i.fond_id = fo.id WHERE fo.archive_id = $1`,
    [archive.id],
  );
  const invByFondCanon = new Map<string, Map<string, TargetRow>>();
  for (const [fondId] of fondLegacyFundIds) invByFondCanon.set(fondId, new Map());
  for (const row of targetInvs.rows) {
    let byCanon = invByFondCanon.get(row.fond_id);
    if (!byCanon) {
      byCanon = new Map();
      invByFondCanon.set(row.fond_id, byCanon);
    }
    const canon = canonicalizeCode(row.code, 'description');
    if (byCanon.has(canon)) {
      report.anomaly('target-collision', 'description', row.id, `existing inventories collide on ${canon}`);
    } else {
      byCanon.set(canon, row);
    }
  }

  const legacyDescs = await client.query<LegacyRow & { fund_id: string }>(
    `SELECT d.id, d.code, d.title, d.info, d.updated_at, d.fund_id
     FROM descriptions d JOIN funds f ON d.fund_id = f.id WHERE f.archive_id = $1`,
    [archive.id],
  );
  const descsByFond = new Map<string, (LegacyRow & { fund_id: string })[]>();
  const fundToFond = new Map(fundMapRows.map(([fundId, fondId]) => [fundId as string, fondId as string]));
  for (const d of legacyDescs.rows) {
    const fondId = fundToFond.get(d.fund_id);
    if (!fondId) continue; // parent fund was skipped (empty code)
    const list = descsByFond.get(fondId);
    if (list) list.push(d);
    else descsByFond.set(fondId, [d]);
  }

  const newInvRows: unknown[][] = [];
  const invFills: [string, string | null, string | null][] = [];
  const descMapRows: unknown[][] = [];
  const invStoredCode = new Map<string, string>();
  const invsByFond = new Map<string, string[]>(); // fond_id → inventory ids (for case pass)
  const skippedDescIds = new Set<string>();

  for (const [fondId, descs] of descsByFond) {
    const fondCode = fondStoredCode.get(fondId)!;
    const parentRef = `${archive.code}-${fondCode}`;
    const before = new Set(descs.map((d) => d.id));
    const groups = groupByCanon(descs, 'description', parentRef, report, stats);
    const seq = analyzeSequence([...groups.keys()]);
    if (seq.missingCount > 0 && seq.total >= 3) {
      report.anomaly('sequence-gap', 'description', parentRef, `${seq.missingCount} missing in ${seq.min}..${seq.max}: ${seq.gaps}`);
    }
    const grouped = new Set([...groups.values()].flat().map((d) => d.id));
    for (const id of before) if (!grouped.has(id)) skippedDescIds.add(id);

    const byCanon = invByFondCanon.get(fondId) ?? new Map<string, TargetRow>();
    for (const [canon, group] of groups) {
      const primary = pickPrimary(group);
      const existing = byCanon.get(canon);
      let invId: string;
      if (existing) {
        invId = existing.id;
        invStoredCode.set(invId, existing.code);
        if ((!hasText(existing.title) && hasText(primary.title)) || (!hasText(existing.info) && hasText(primary.info))) {
          invFills.push([invId, primary.title, primary.info]);
        }
        if (existing.code !== canon) {
          report.anomaly('code-diff', 'description', `${parentRef}/${canon}`, `kept existing inventory code "${existing.code}"`);
        }
        bump(stats, 'inventories_matched');
      } else {
        invId = randomUUID();
        invStoredCode.set(invId, canon);
        newInvRows.push([invId, canon, primary.title, primary.info, fondId, primary.updated_at]);
        bump(stats, 'inventories_created');
      }
      descMapRows.push(...group.map((d) => [d.id, invId]));
      invsByFond.set(fondId, [...(invsByFond.get(fondId) ?? []), invId]);
    }
  }

  await insertMany(client, 'inventories', ['id', 'code', 'title', 'info', 'fond_id', 'updated_at'], newInvRows, '');
  await fillMissingText(client, 'inventories', invFills);
  await insertMany(client, 'mig_desc_map', ['description_id', 'inventory_id'], descMapRows, '');

  const descToInv = new Map(descMapRows.map(([dId, iId]) => [dId as string, iId as string]));

  // ---------- files (per fond, to bound memory) ----------
  for (const [fondId, legacyFundIds] of fondLegacyFundIds) {
    const fondCode = fondStoredCode.get(fondId)!;
    const legacyCases = await client.query<LegacyRow & { description_id: string }>(
      `SELECT c.id, c.code, c.title, c.info, c.updated_at, c.tags, c.description_id
       FROM cases c JOIN descriptions d ON c.description_id = d.id
       WHERE d.fund_id = ANY($1)`,
      [legacyFundIds],
    );
    if (!legacyCases.rows.length) continue;

    const byInv = new Map<string, (LegacyRow & { description_id: string })[]>();
    for (const c of legacyCases.rows) {
      if (skippedDescIds.has(c.description_id)) {
        bump(stats, 'cases_skipped_with_parent');
        continue;
      }
      const invId = descToInv.get(c.description_id);
      if (!invId) continue;
      const list = byInv.get(invId);
      if (list) list.push(c);
      else byInv.set(invId, [c]);
    }
    if (!byInv.size) continue;

    const existingFiles = await client.query<TargetRow & { inventory_id: string }>(
      'SELECT id, code, title, info, inventory_id FROM files WHERE inventory_id = ANY($1)',
      [[...byInv.keys()]],
    );
    const filesByInvCanon = new Map<string, Map<string, TargetRow>>();
    for (const row of existingFiles.rows) {
      let m = filesByInvCanon.get(row.inventory_id);
      if (!m) {
        m = new Map();
        filesByInvCanon.set(row.inventory_id, m);
      }
      const canon = canonicalizeCode(row.code, 'case');
      if (!m.has(canon)) m.set(canon, row);
    }

    const newFileRows: unknown[][] = [];
    const fileFills: [string, string | null, string | null][] = [];
    const caseMapRows: unknown[][] = [];

    for (const [invId, casesOfInv] of byInv) {
      const invCode = invStoredCode.get(invId)!;
      const parentRef = `${archive.code}-${fondCode}-${invCode}`;
      const groups = groupByCanon(casesOfInv, 'case', parentRef, report, stats);
      const seq = analyzeSequence([...groups.keys()]);
      if (seq.missingCount > 0 && seq.total >= 10) {
        report.anomaly('sequence-gap', 'case', parentRef, `${seq.missingCount} missing in ${seq.min}..${seq.max}: ${seq.gaps}`);
      }
      const byCanon = filesByInvCanon.get(invId) ?? new Map<string, TargetRow>();

      for (const [canon, group] of groups) {
        const primary = pickPrimary(group);
        // conflicting duplicates: same canonical code, different non-empty titles
        const titles = new Set(group.filter((c) => hasText(c.title)).map((c) => c.title!.trim()));
        let tags = primary.tags ?? null;
        if (titles.size > 1) {
          for (const dropped of group) {
            if (dropped.id === primary.id) continue;
            report.conflict('case', `${parentRef}-${canon}`, primary.code, dropped.code, `titles differ: "${primary.title?.slice(0, 80)}" vs "${dropped.title?.slice(0, 80)}"`);
          }
          tags = [...new Set([...(tags ?? []), 'migration-conflict'])];
          bump(stats, 'file_conflicts');
        }

        const existing = byCanon.get(canon);
        let fileId: string;
        if (existing) {
          fileId = existing.id;
          if ((!hasText(existing.title) && hasText(primary.title)) || (!hasText(existing.info) && hasText(primary.info))) {
            fileFills.push([fileId, primary.title, primary.info]);
          }
          bump(stats, 'files_matched');
        } else {
          fileId = randomUUID();
          const fullCode = [archive.code, fondCode, invCode, canon].join('-');
          newFileRows.push([fileId, canon, fullCode, primary.title, primary.info, tags, invId, primary.updated_at]);
          bump(stats, 'files_created');
        }
        caseMapRows.push(...group.map((c) => [c.id, fileId]));
      }
    }

    await insertMany(
      client,
      'files',
      ['id', 'code', 'full_code', 'title', 'info', 'tags', 'inventory_id', 'updated_at'],
      newFileRows,
      '',
    );
    await fillMissingText(client, 'files', fileFills);
    await insertMany(client, 'mig_case_map', ['case_id', 'file_id'], caseMapRows, '');
  }

  // ---------- satellites ----------
  const sat = async (label: string, sql: string): Promise<void> => {
    const res = await client.query(sql);
    bump(stats, label, res.rowCount ?? 0);
  };
  await sat('fond_years_copied', `
    INSERT INTO fond_years (fond_id, start_year, end_year)
    SELECT m.fond_id, y.start_year, y.end_year FROM fund_years y JOIN mig_fund_map m USING (fund_id)
    ON CONFLICT DO NOTHING`);
  await sat('inventory_years_copied', `
    INSERT INTO inventory_years (inventory_id, start_year, end_year)
    SELECT m.inventory_id, y.start_year, y.end_year FROM description_years y JOIN mig_desc_map m USING (description_id)
    ON CONFLICT DO NOTHING`);
  await sat('file_years_copied', `
    INSERT INTO file_years (file_id, start_year, end_year)
    SELECT m.file_id, y.start_year, y.end_year FROM case_years y JOIN mig_case_map m USING (case_id)
    ON CONFLICT DO NOTHING`);
  await sat('file_authors_copied', `
    INSERT INTO file_authors (file_id, author_id)
    SELECT m.file_id, ca.author_id FROM case_authors ca JOIN mig_case_map m USING (case_id)
    ON CONFLICT DO NOTHING`);
  await sat('file_locations_copied', `
    INSERT INTO file_locations (file_id, lat, lng, radius_m)
    SELECT m.file_id, cl.lat, cl.lng, cl.radius_m FROM case_locations cl JOIN mig_case_map m USING (case_id)
    ON CONFLICT (file_id, lat, lng, radius_m) DO NOTHING`);
};
