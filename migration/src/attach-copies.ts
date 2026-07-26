import { attachFileCopiesByParsed, attachInventoryCopiesByParsed } from './copies';
import { pool, withClient } from './db';
import { ArchiveRow, Stats } from './entities';

const usage = `Usage: pnpm tsx migration/src/attach-copies.ts [ARCHIVE_CODE] [--dry-run] [--level=files|inventories|both]

Attaches currently-unattached file_online_copies / inventory_online_copies rows to
files/inventories by matching canonical(parsed) to the target's canonical full_code
(exact match first, then volume/part grouping — ТОМ/ЧАСТ/П/ПР inventory codes fall
back to their base instance). Self-contained: reads only current-schema tables, never
legacy fund/description/case data, so it can run at any time — independent of
migrate.ts and its per-archive transaction.

With no ARCHIVE_CODE, runs against every archive that has fonds. One archive = one transaction.
--dry-run executes everything then ROLLS BACK.
--level limits the run to one copy table (default: both). Use --level=files when
inventory-level links should go through editor review (create-inventory-link-actions.ts).
DB: postgres://localhost/inspector_local (override: MIGRATION_DATABASE_URL)`;

const bump = (stats: Stats, key: string, by = 1): void => {
  stats[key] = (stats[key] ?? 0) + by;
};

type Level = 'files' | 'inventories' | 'both';

const runArchive = async (archive: ArchiveRow, dryRun: boolean, level: Level): Promise<Stats> =>
  withClient(async (client) => {
    const stats: Stats = {};
    await client.query('BEGIN');
    try {
      if (level !== 'inventories') await attachFileCopiesByParsed(client, archive, stats);
      if (level !== 'files') await attachInventoryCopiesByParsed(client, archive, stats);
      await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
    return stats;
  });

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const archiveCode = args.find((a) => !a.startsWith('--'));
  const level = (args.find((a) => a.startsWith('--level='))?.slice('--level='.length) ?? 'both') as Level;

  if (args.includes('--help')) {
    console.log(usage);
    return;
  }
  if (!['files', 'inventories', 'both'].includes(level)) {
    console.error(`Invalid --level "${level}"\n\n${usage}`);
    process.exitCode = 1;
    return;
  }

  const archives = await pool.query<ArchiveRow>(
    archiveCode
      ? 'SELECT a.id, a.code FROM archives a WHERE a.code = $1'
      : `SELECT DISTINCT a.id, a.code FROM archives a JOIN fonds fo ON fo.archive_id = a.id ORDER BY a.code`,
    archiveCode ? [archiveCode] : [],
  );
  if (!archives.rows.length) {
    console.error(archiveCode ? `Archive "${archiveCode}" not found` : 'No archives with fonds found');
    process.exitCode = 1;
    return;
  }

  const totals: Stats = {};
  for (const archive of archives.rows) {
    const stats = await runArchive(archive, dryRun, level);
    const attached = (stats.copies_attached_by_parsed ?? 0) + (stats.inv_copies_attached_by_parsed ?? 0);
    if (attached > 0 || archiveCode) {
      console.log(`[${archive.code}] +${stats.copies_attached_by_parsed ?? 0} file / +${stats.inv_copies_attached_by_parsed ?? 0} inventory` +
        ` (still unattached: ${stats.copies_left_unattached ?? 0} file / ${stats.inv_copies_left_unattached ?? 0} inventory)`);
    }
    for (const [k, v] of Object.entries(stats)) bump(totals, k, v);
  }

  console.log(`\n${dryRun ? '(dry run) ' : ''}Totals across ${archives.rows.length} archive(s):`);
  console.table(totals);
  await pool.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
