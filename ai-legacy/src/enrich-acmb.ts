/**
 * ЗКМК enrichment — data-owner decisions 2026-07-23:
 * enrich the catalog from the Aggregated Catalog of Metrical Books
 * (github.com/duckarchive/acmb, release CSVs loaded into `mig_acmb` staging;
 * codes normalized: spaces/dots stripped, archive names mapped to codes).
 *
 *   pnpm exec tsx -r dotenv/config ai-legacy/src/enrich-acmb.ts [--dry-run]
 *
 * Scope (all approved):
 *  - CREATE missing hierarchy: fonds → описи → справи for every ЗКМК unit absent
 *    from the catalog (created fond/опис rows carry code only, no title);
 *  - titles: ONLY files with empty titles get «Метрична книга. <церкви>» (max 5
 *    churches listed);
 *  - tags: add "метрична книга" + record types (народження/шлюб/смерть/…);
 *  - authors: every distinct church becomes an Author (matched by exact title,
 *    created if missing) linked via file_authors;
 *  - years: ONLY files with zero file_years get ЗКМК contiguous year runs.
 *
 * Self-contained (this branch has no ai-legacy pipeline): pg + fs only.
 * One transaction; --dry-run rolls back. Audit in ai-legacy/out/acmb/
 * (report.md + created.csv listing every created fond/опис).
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: (process.env.AI_LEGACY_DATABASE_URL ?? process.env.DATABASE_URL ?? '').replace(
    /\?schema=[^&]*(&|$)/,
    '',
  ),
  max: 4,
});

const OUT_DIR = path.join('ai-legacy', 'out', 'acmb');
const stats: Record<string, number> = {};
const csvEscape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  mkdirSync(OUT_DIR, { recursive: true });
  const createdCsv = path.join(OUT_DIR, `created${dryRun ? '.dry-run' : ''}.csv`);
  writeFileSync(createdCsv, 'kind,full_code\n');

  const client = await pool.connect();
  const startedAt = Date.now();
  try {
    await client.query('BEGIN');

    // ── Phase A: create missing hierarchy ──────────────────────────────────
    const fonds = await client.query<{ full: string }>(
      `INSERT INTO fonds (id, code, archive_id)
       SELECT gen_random_uuid(), u.f, ar.id
       FROM (SELECT DISTINCT archive_code, f FROM mig_acmb) u
       JOIN archives ar ON ar.code = u.archive_code
       WHERE NOT EXISTS (SELECT 1 FROM fonds fo WHERE fo.archive_id = ar.id AND fo.code = u.f)
       RETURNING (SELECT code FROM archives WHERE id = archive_id) || '-' || code AS full`,
    );
    for (const r of fonds.rows) appendFileSync(createdCsv, `fond,${csvEscape(r.full)}\n`);
    stats.fonds_created = fonds.rowCount ?? 0;
    console.log(`  fonds created: ${fonds.rowCount}`);

    const invs = await client.query<{ full: string }>(
      `INSERT INTO inventories (id, code, fond_id)
       SELECT gen_random_uuid(), u.d, fo.id
       FROM (SELECT DISTINCT archive_code, f, d FROM mig_acmb) u
       JOIN archives ar ON ar.code = u.archive_code
       JOIN fonds fo ON fo.archive_id = ar.id AND fo.code = u.f
       WHERE NOT EXISTS (SELECT 1 FROM inventories i WHERE i.fond_id = fo.id AND i.code = u.d)
       RETURNING (SELECT a.code || '-' || f2.code FROM fonds f2 JOIN archives a ON a.id = f2.archive_id WHERE f2.id = fond_id) || '-' || code AS full`,
    );
    for (const r of invs.rows) appendFileSync(createdCsv, `inventory,${csvEscape(r.full)}\n`);
    stats.inventories_created = invs.rowCount ?? 0;
    console.log(`  inventories created: ${invs.rowCount}`);

    const files = await client.query(
      `INSERT INTO files (id, code, inventory_id, full_code, tags)
       SELECT gen_random_uuid(), u.c, i.id, u.full_code, '{}'
       FROM (SELECT DISTINCT archive_code, f, d, c, full_code FROM mig_acmb) u
       JOIN archives ar ON ar.code = u.archive_code
       JOIN fonds fo ON fo.archive_id = ar.id AND fo.code = u.f
       JOIN inventories i ON i.fond_id = fo.id AND i.code = u.d
       WHERE NOT EXISTS (SELECT 1 FROM files fi WHERE fi.inventory_id = i.id AND fi.code = u.c)
       ON CONFLICT DO NOTHING`,
    );
    stats.files_created = files.rowCount ?? 0;
    console.log(`  files created: ${files.rowCount}`);

    // ── Phase B: enrichment over every matched file (incl. just-created) ───
    const titles = await client.query(
      `WITH ch AS (
         SELECT full_code, array_agg(DISTINCT church_name ORDER BY church_name) AS names
         FROM mig_acmb WHERE church_name IS NOT NULL GROUP BY full_code
       )
       UPDATE files f SET title =
         'Метрична книга. ' || array_to_string(ch.names[1:5], '; ')
         || CASE WHEN cardinality(ch.names) > 5 THEN ' та інші церкви' ELSE '' END
       FROM ch
       WHERE ch.full_code = f.full_code AND (f.title IS NULL OR f.title = '')`,
    );
    stats.titles_filled = titles.rowCount ?? 0;
    // ЗКМК rows without a church name still identify the file as a метрична книга
    const plainTitles = await client.query(
      `UPDATE files f SET title = 'Метрична книга'
       WHERE (f.title IS NULL OR f.title = '')
         AND EXISTS (SELECT 1 FROM mig_acmb m WHERE m.full_code = f.full_code)`,
    );
    stats.titles_filled_no_church = plainTitles.rowCount ?? 0;
    console.log(`  empty titles filled: ${titles.rowCount} (+${plainTitles.rowCount} without church)`);

    const tags = await client.query(
      `WITH tt AS (
         SELECT full_code, array_agg(DISTINCT record_type) || ARRAY['метрична книга'] AS types
         FROM mig_acmb GROUP BY full_code
       )
       UPDATE files f SET tags = (SELECT array_agg(DISTINCT t ORDER BY t) FROM unnest(f.tags || tt.types) AS t)
       FROM tt
       WHERE tt.full_code = f.full_code AND NOT (f.tags @> tt.types)`,
    );
    stats.files_tagged = tags.rowCount ?? 0;
    console.log(`  files tagged: ${tags.rowCount}`);

    const authors = await client.query(
      `INSERT INTO authors (id, title, tags)
       SELECT gen_random_uuid(), u.church_name, '{}'
       FROM (SELECT DISTINCT church_name FROM mig_acmb WHERE church_name IS NOT NULL) u
       WHERE NOT EXISTS (SELECT 1 FROM authors a WHERE a.title = u.church_name)`,
    );
    stats.authors_created = authors.rowCount ?? 0;
    console.log(`  authors created: ${authors.rowCount}`);

    const links = await client.query(
      `INSERT INTO file_authors (file_id, author_id)
       SELECT DISTINCT f.id, a.id
       FROM (SELECT DISTINCT full_code, church_name FROM mig_acmb WHERE church_name IS NOT NULL) m
       JOIN files f ON f.full_code = m.full_code
       JOIN authors a ON a.title = m.church_name
       ON CONFLICT DO NOTHING`,
    );
    stats.file_authors_linked = links.rowCount ?? 0;
    console.log(`  file-author links: ${links.rowCount}`);

    const years = await client.query(
      `INSERT INTO file_years (file_id, start_year, end_year)
       SELECT file_id, min(year), max(year)
       FROM (
         SELECT f.id AS file_id, m.year,
                m.year - dense_rank() OVER (PARTITION BY f.id ORDER BY m.year) AS grp
         FROM (SELECT DISTINCT full_code, year FROM mig_acmb) m
         JOIN files f ON f.full_code = m.full_code
         WHERE NOT EXISTS (SELECT 1 FROM file_years y WHERE y.file_id = f.id)
       ) runs
       GROUP BY file_id, grp
       ON CONFLICT DO NOTHING`,
    );
    stats.year_ranges_inserted = years.rowCount ?? 0;
    console.log(`  year ranges inserted: ${years.rowCount}`);

    // ── sanity inside the transaction ──────────────────────────────────────
    const dup = await client.query(
      'SELECT count(*)::int AS n FROM (SELECT full_code FROM files GROUP BY full_code HAVING count(*) > 1) d',
    );
    if (dup.rows[0].n > 0) throw new Error(`duplicate full_codes after enrichment: ${dup.rows[0].n} — rolling back`);
    const unmatched = await client.query(
      `SELECT count(DISTINCT full_code)::int AS n FROM mig_acmb m
       WHERE NOT EXISTS (SELECT 1 FROM files f WHERE f.full_code = m.full_code)`,
    );
    stats.units_still_unmatched = unmatched.rows[0].n;

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('\nDRY RUN — all database changes rolled back.');
    } else {
      await client.query('COMMIT');
    }

    const lines = [
      '# ЗКМК (acmb) enrichment',
      '',
      `Generated: ${new Date().toISOString()}${dryRun ? ' (DRY RUN — rolled back)' : ''}`,
      '',
      '| stat | value |',
      '|---|---:|',
      ...Object.entries(stats).map(([k, v]) => `| ${k} | ${v.toLocaleString()} |`),
      '',
      `Created rows audit: \`${path.basename(createdCsv)}\``,
      '',
    ];
    writeFileSync(path.join(OUT_DIR, `report${dryRun ? '.dry-run' : ''}.md`), lines.join('\n'));
    console.log(`\nDone in ${((Date.now() - startedAt) / 60_000).toFixed(1)} min. Report in ${OUT_DIR}/`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

main().catch((err) => {
  console.error('\nFATAL:', err);
  process.exit(1);
});
