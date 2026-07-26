import { canonParsed, lookupByCanon } from './copies';
import { insertMany, pool, withClient } from './db';
import { canonicalizeFullCode } from './normalize';

const usage = `Usage: pnpm tsx migration/src/create-inventory-link-actions.ts [--dry-run]

For every unattached inventory_online_copies row whose canonical(parsed) resolves to
exactly one inventory (exact full-code match, or ТОМ/ЧАСТ/П/ПР grouped to the base
instance), creates a PENDING connect_to_online_copy inventory_actions row instead of
attaching directly — links then go through admin review in /editor. Copies that already
have a pending connect action are skipped; re-runs are no-ops for existing pairs
(partial unique index on pending (type, online_copy_id, inventory_id)).

created_by: "auto-link-by-parsed". Grouped matches carry an explanatory note.
--dry-run executes everything then ROLLS BACK.
DB: postgres://localhost/inspector_local (override: MIGRATION_DATABASE_URL)`;

const CREATED_BY = 'auto-link-by-parsed';

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log(usage);
    return;
  }
  const dryRun = args.includes('--dry-run');

  await withClient(async (client) => {
    await client.query('BEGIN');
    try {
      const invs = await client.query<{ id: string; full_code: string }>(`
        SELECT i.id, a.code || '-' || fo.code || '-' || i.code AS full_code
        FROM inventories i
        JOIN fonds fo ON fo.id = i.fond_id
        JOIN archives a ON a.id = fo.archive_id`);
      const invByCanon = new Map<string, string | null>();
      const codeById = new Map<string, string>();
      for (const i of invs.rows) {
        const canon = canonicalizeFullCode(i.full_code) ?? i.full_code;
        invByCanon.set(canon, invByCanon.has(canon) ? null : i.id);
        codeById.set(i.id, i.full_code);
      }

      const copies = await client.query<{ id: string; parsed: string; rtype: string }>(`
        SELECT ioc.id, ioc.parsed, r.type AS rtype
        FROM inventory_online_copies ioc
        JOIN resources r ON r.id = ioc.resource_id
        WHERE ioc.inventory_id IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM inventory_actions ia
            WHERE ia.online_copy_id = ioc.id
              AND ia.type = 'connect_to_online_copy' AND ia.resolved_at IS NULL
          )`);

      const rows: unknown[][] = [];
      let exact = 0;
      let grouped = 0;
      let unmatched = 0;
      for (const copy of copies.rows) {
        const canon = canonParsed(copy.parsed, copy.rtype);
        const match = canon ? lookupByCanon(invByCanon, canon) : null;
        if (!match) {
          unmatched += 1;
          continue;
        }
        const note = match.grouped
          ? `Групування томів/частин: ${copy.parsed} → ${codeById.get(match.id)}`
          : null;
        rows.push([CREATED_BY, 'connect_to_online_copy', note, copy.id, match.id]);
        if (match.grouped) grouped += 1;
        else exact += 1;
      }

      const inserted = await insertMany(
        client,
        'inventory_actions',
        ['created_by', 'type', 'note', 'online_copy_id', 'inventory_id'],
        rows,
        `ON CONFLICT (type, online_copy_id, inventory_id) WHERE resolved_at IS NULL DO NOTHING`,
      );

      await client.query(dryRun ? 'ROLLBACK' : 'COMMIT');
      console.log(`${dryRun ? '(dry run) ' : ''}pending connect_to_online_copy actions created: ${inserted}`);
      console.table({
        copies_considered: copies.rows.length,
        matched_exact: exact,
        matched_grouped: grouped,
        unmatched_left: unmatched,
        skipped_existing_pending: rows.length - inserted,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  });
  await pool.end();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
