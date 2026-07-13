import { migrateCopies } from './copies';
import { pool, withClient } from './db';
import { ArchiveRow, migrateEntities, Stats } from './entities';
import { ArchiveReport } from './report';
import { verifyArchive } from './verify';

const usage = `Usage: pnpm tsx migration/src/migrate.ts <ARCHIVE_CODE> [--dry-run]
       pnpm tsx migration/src/migrate.ts --list

Runs the full legacy→new migration for ONE archive inside a single transaction.
--dry-run executes everything, writes reports, then ROLLS BACK.
DB: postgres://localhost/inspector_local (override: MIGRATION_DATABASE_URL)`;

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const archiveCode = args.find((a) => !a.startsWith('--'));

  if (args.includes('--list')) {
    const res = await pool.query(`
      SELECT a.code, count(DISTINCT f.id)::int AS funds,
             count(DISTINCT c.id)::int AS cases
      FROM archives a
      LEFT JOIN funds f ON f.archive_id = a.id
      LEFT JOIN descriptions d ON d.fund_id = f.id
      LEFT JOIN cases c ON c.description_id = d.id
      GROUP BY a.code HAVING count(f.id) > 0 ORDER BY cases`);
    console.table(res.rows);
    return;
  }
  if (!archiveCode) {
    console.log(usage);
    process.exitCode = 1;
    return;
  }

  await withClient(async (client) => {
    const arch = await client.query<ArchiveRow>('SELECT id, code FROM archives WHERE code = $1', [archiveCode]);
    if (!arch.rows.length) throw new Error(`Archive "${archiveCode}" not found`);
    const archive = arch.rows[0];

    const report = new ArchiveReport(archive.code);
    const stats: Stats = {};
    const t0 = Date.now();

    console.log(`[${archive.code}] starting${dryRun ? ' (dry run)' : ''}…`);
    await client.query('BEGIN');
    try {
      console.log(`[${archive.code}] phase 2: entities…`);
      await migrateEntities(client, archive, report, stats);

      console.log(`[${archive.code}] phase 3: online copies…`);
      await migrateCopies(client, archive, report, stats);

      console.log(`[${archive.code}] phase 4: verify…`);
      const problems = await verifyArchive(client, archive, report, stats);

      report.section('Stats', [
        '| key | value |',
        '|---|---|',
        ...Object.entries(stats)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `| ${k} | ${v} |`),
        '',
        `Anomalies: ${report.anomalyCount}, conflicts for review: ${report.conflictCount}`,
        `Duration: ${((Date.now() - t0) / 1000).toFixed(1)}s`,
      ]);

      if (dryRun) {
        await client.query('ROLLBACK');
        console.log(`[${archive.code}] dry run complete — rolled back.`);
      } else if (problems.length) {
        await client.query('ROLLBACK');
        console.error(`[${archive.code}] verification FAILED — rolled back:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
        process.exitCode = 2;
      } else {
        await client.query('COMMIT');
        console.log(`[${archive.code}] committed.`);
      }
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      report.flush(dryRun);
      console.log(`[${archive.code}] reports written to migration/out/${archive.code}/`);
      console.table(stats);
    }
  });
  await pool.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
