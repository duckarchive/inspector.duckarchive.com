/**
 * Fix ДАХО page-number-as-fond anomalies (2026-07-28).
 *
 * Root cause: the upstream ЗКМК/acmb builder parsed the «Метричні книги»
 * catalog OCR (mbv5-b1.txt …) where records flow across page breaks of the
 * form "\n<page№>\n<running header>\n". When a break split "ф. 40," from
 * "оп. 105, спр. 607", the page number was taken as the fond →
 * rows like f=249 d=105 (should be f=40 d=105). enrich-acmb.ts then created
 * shell fonds/описи/files from those rows (1 file each, «Метрична книга…»
 * titles, 1 author link + 1 year row, 0 copies).
 *
 * Strategy (verification-driven — only provable rows are fixed):
 *   1. Parse the OCR file(s): find page breaks (bare number line followed by
 *      a known running header). For each break record:
 *        - trueFond = last "ф. <N>" before the break;
 *        - opAfter  = first "оп. <N>, спр. <list>" right after the header;
 *        - spravaList = справи numbers in that leading list.
 *   2. For each anomalous inventory ДАХО-<P>-<O> (P = suspected page number)
 *      from REVIEW-remaining.csv, with its files:
 *        - page break P must exist, opAfter must equal O, trueFond found;
 *        - confidence 'exact'  : file code appears in spravaList;
 *          confidence 'op-only': op matches but file code is further away
 *          (the buggy parser may have propagated the page-fond to several
 *          records until the next explicit "ф."). Both are shown in dry-run;
 *          --apply fixes 'exact' always and 'op-only' only with --apply-op-only.
 *   3. Apply (single transaction, audit table mig_daho_page_fix):
 *        - target опис ДАХО-<trueFond>-<O> must already exist (never created);
 *        - file code free in target → move (UPDATE inventory_id — keeps
 *          title/author/years);
 *        - file code taken in target → merge: add missing file_authors links
 *          and missing file_years rows to the target file (метричні книги
 *          справи legitimately host several parishes), delete the shell file.
 *          Target title is left untouched — the author link carries the
 *          church association.
 *        - delete the emptied anomalous опис; delete its fond too if it is a
 *          blank shell (empty title, no other описи, no fond-level children).
 *
 * Usage:
 *   pnpm exec tsx migration/src/fix-daho-page-fonds.ts mbv5-b1.txt            # dry-run
 *   pnpm exec tsx migration/src/fix-daho-page-fonds.ts mbv5-b1.txt --apply
 *   pnpm exec tsx migration/src/fix-daho-page-fonds.ts mbv5-b1.txt --apply --apply-op-only
 *
 * DB: postgres:///inspector_3 (override MIGRATION_DATABASE_URL).
 * Unfixable rows are reported to migration/out/inventory-code-anomalies/daho-page-fix-report.csv
 * and REVIEW-remaining.csv is rewritten without the fixed rows on --apply.
 */
import { readFileSync, writeFileSync } from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.MIGRATION_DATABASE_URL || 'postgres:///inspector_3?host=/var/run/postgresql',
  max: 2,
});

const REVIEW_CSV = 'migration/out/inventory-code-anomalies/REVIEW-remaining.csv';
const REPORT_CSV = 'migration/out/inventory-code-anomalies/daho-page-fix-report.csv';

const HEADERS = ['Державний архів Харківської області', 'Міжархівний довідник'];

interface PageBreak {
  page: number;
  book: string;
  trueFond: string | null;
  opAfter: string | null;
  spravaList: string[];
  afterSnippet: string;
  beforeSnippet: string;
}

// ---------- 1. OCR parsing ----------
// Page numbering restarts in every book, so each file gets its own map and
// judge() tries them all, preferring the book where the file code is provable.

function parseOcr(paths: string[]): Map<number, PageBreak>[] {
  return paths.map((path) => {
    const breaks = new Map<number, PageBreak>();
    const lines = readFileSync(path, 'utf8').split('\n').map((l) => l.trim());
    for (let i = 0; i < lines.length - 1; i++) {
      if (!/^\d{1,4}$/.test(lines[i])) continue;
      if (!HEADERS.includes(lines[i + 1])) continue;
      const page = parseInt(lines[i], 10);

      const before = lines.slice(Math.max(0, i - 12), i).join(' ');
      const after = lines.slice(i + 2, i + 8).join(' ');

      const fondBefore = [...before.matchAll(/ф[.,]\s*(\d+)/g)].map((m) => m[1]).pop() ?? null;
      const opBefore = [...before.matchAll(/оп[.,]\s*(\d+)/g)].map((m) => m[1]).pop() ?? null;

      // The record continuation right after the header comes in three shapes,
      // depending on where the break cut the reference "рік: ф. F, оп. O, спр. S":
      //   1. "оп. 105, спр. 607, 610; …"        (ф. before the break)
      //   2. "ф. 40, оп. 105, спр. 1061а; …"    (break between рік: and ф.)
      //   3. "спр. 607, 610; …"                 (ф. + оп. before the break)
      let trueFond: string | null = null;
      let opAfter: string | null = null;
      let spravaList: string[] = [];
      const m =
        after.match(/^\s*ф[.,]\s*(\d+)\s*,\s*оп[.,]\s*(\d+)\s*,\s*спр[.,]\s*([^;:]*)/) ||
        after.match(/^\s*()оп[.,]\s*(\d+)\s*,\s*спр[.,]\s*([^;:]*)/) ||
        after.match(/^\s*()()спр[.,]\s*([^;:]*)/);
      if (m) {
        trueFond = m[1] || fondBefore;
        opAfter = m[2] || opBefore;
        spravaList = [...m[3].matchAll(/\d+[А-ЯІЇЄа-яіїє]?/g)].map((x) => x[0].toUpperCase());
      }

      // First break wins if a bare number collides with an index-page number:
      // genuine page breaks appear in ascending order exactly once.
      if (!breaks.has(page)) {
        breaks.set(page, {
          page,
          book: path,
          trueFond,
          opAfter,
          spravaList,
          afterSnippet: after.slice(0, 120),
          beforeSnippet: before.slice(-120),
        });
      }
    }
    return breaks;
  });
}

// ---------- 2. Load anomalies ----------

interface AnomFile {
  id: string;
  code: string;
  title: string | null;
}
interface Anom {
  invId: string;
  fond: string; // suspected page number
  inv: string;
  fullCode: string;
  files: AnomFile[];
}

async function loadAnomalies(): Promise<Anom[]> {
  const csv = readFileSync(REVIEW_CSV, 'utf8').split('\n').slice(1);
  const codes = csv.map((l) => l.split(',')[0]).filter((c) => c && c.startsWith('ДАХО-'));
  const { rows } = await pool.query(
    `SELECT i.id AS inv_id, fo.code AS fond, i.code AS inv,
            'ДАХО-'||fo.code||'-'||i.code AS full_code,
            coalesce(json_agg(json_build_object('id', f.id, 'code', f.code, 'title', f.title))
                     FILTER (WHERE f.id IS NOT NULL), '[]') AS files
     FROM archives a
     JOIN fonds fo ON fo.archive_id = a.id
     JOIN inventories i ON i.fond_id = fo.id
     LEFT JOIN files f ON f.inventory_id = i.id
     WHERE a.code = 'ДАХО' AND 'ДАХО-'||fo.code||'-'||i.code = ANY($1)
     GROUP BY 1, 2, 3, 4`,
    [codes],
  );
  const found = new Set(rows.map((r: any) => r.full_code));
  for (const c of codes) if (!found.has(c)) console.warn(`  ! ${c}: not in DB (skipped)`);
  return rows.map((r: any) => ({
    invId: r.inv_id,
    fond: r.fond,
    inv: r.inv,
    fullCode: r.full_code,
    files: r.files,
  }));
}

// ---------- 3. Match ----------

type Verdict =
  | { status: 'exact' | 'op-only'; trueFond: string; br?: PageBreak }
  | { status: 'no-page-break' | 'no-fond-before' | 'op-mismatch' | 'not-numeric-fond' | 'ambiguous'; br?: PageBreak };

function judgeOne(anom: Anom, breaks: Map<number, PageBreak>): Verdict {
  if (!/^\d+$/.test(anom.fond)) return { status: 'not-numeric-fond' };
  const br = breaks.get(parseInt(anom.fond, 10));
  if (!br) return { status: 'no-page-break' };
  if (!br.trueFond) return { status: 'no-fond-before', br };
  if (br.opAfter !== anom.inv) return { status: 'op-mismatch', br };
  const allNear = anom.files.every((f) => br.spravaList.includes(f.code.toUpperCase()));
  return { status: allNear ? 'exact' : 'op-only', trueFond: br.trueFond, br };
}

// Page numbering restarts per book — try every book, prefer the one that
// proves the file code; two conflicting exact matches would be 'ambiguous'.
function judge(anom: Anom, books: Map<number, PageBreak>[]): Verdict {
  const verdicts = books.map((b) => judgeOne(anom, b));
  const exact = verdicts.filter((v) => v.status === 'exact');
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) {
    const fonds = new Set(exact.map((v) => (v as any).trueFond));
    return fonds.size === 1 ? exact[0] : { status: 'ambiguous', br: exact[0].br };
  }
  const opOnly = verdicts.filter((v) => v.status === 'op-only');
  if (opOnly.length === 1) return opOnly[0];
  if (opOnly.length > 1) {
    const fonds = new Set(opOnly.map((v) => (v as any).trueFond));
    return fonds.size === 1 ? opOnly[0] : { status: 'ambiguous', br: opOnly[0].br };
  }
  // most informative failure: op-mismatch > no-fond-before > no-page-break
  const rank = { 'op-mismatch': 0, 'no-fond-before': 1, 'no-page-break': 2, 'not-numeric-fond': 3 } as any;
  return verdicts.sort((a, b) => rank[a.status] - rank[b.status])[0];
}

// ---------- 4. Apply ----------

async function apply(fixes: { anom: Anom; trueFond: string; status: string }[]) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mig_daho_page_fix (
        old_full_code text, new_full_code text, file_code text, action text,
        file_title text, deleted_fond boolean, fixed_at timestamp DEFAULT now())`);

    for (const { anom, trueFond } of fixes) {
      const tgt = await client.query(
        `SELECT i.id, fo.id AS fond_id FROM archives a
         JOIN fonds fo ON fo.archive_id=a.id AND fo.code=$1
         JOIN inventories i ON i.fond_id=fo.id AND i.code=$2
         WHERE a.code='ДАХО'`,
        [trueFond, anom.inv],
      );
      if (tgt.rowCount !== 1) throw new Error(`${anom.fullCode}: target ДАХО-${trueFond}-${anom.inv} not found`);
      const targetInvId = tgt.rows[0].id;

      for (const f of anom.files) {
        const coll = await client.query(
          `SELECT id FROM files WHERE inventory_id=$1 AND code=$2`,
          [targetInvId, f.code],
        );
        let action: string;
        if (coll.rowCount === 0) {
          await client.query(`UPDATE files SET inventory_id=$1 WHERE id=$2`, [targetInvId, f.id]);
          action = 'move';
        } else {
          const tgtFileId = coll.rows[0].id;
          await client.query(
            `INSERT INTO file_authors (file_id, author_id)
             SELECT $1, fa.author_id FROM file_authors fa
             WHERE fa.file_id=$2
               AND NOT EXISTS (SELECT 1 FROM file_authors x WHERE x.file_id=$1 AND x.author_id=fa.author_id)`,
            [tgtFileId, f.id],
          );
          await client.query(
            `INSERT INTO file_years (file_id, start_year, end_year)
             SELECT $1, fy.start_year, fy.end_year FROM file_years fy
             WHERE fy.file_id=$2
             ON CONFLICT (file_id, start_year, end_year) DO NOTHING`,
            [tgtFileId, f.id],
          );
          await client.query(`DELETE FROM file_years   WHERE file_id=$1`, [f.id]);
          await client.query(`DELETE FROM file_authors WHERE file_id=$1`, [f.id]);
          await client.query(`DELETE FROM files WHERE id=$1`, [f.id]);
          action = 'merge';
        }
        await client.query(
          `INSERT INTO mig_daho_page_fix (old_full_code, new_full_code, file_code, action, file_title)
           VALUES ($1, $2, $3, $4, $5)`,
          [anom.fullCode, `ДАХО-${trueFond}-${anom.inv}`, f.code, action, f.title],
        );
      }

      // the anomalous опис must now be empty
      const left = await client.query(`SELECT count(*)::int AS n FROM files WHERE inventory_id=$1`, [anom.invId]);
      if (left.rows[0].n !== 0) throw new Error(`${anom.fullCode}: files left after fix`);
      await client.query(`DELETE FROM inventories WHERE id=$1`, [anom.invId]);

      // shell fond cleanup: blank title, no описи left, no fond-level children
      const del = await client.query(
        `DELETE FROM fonds fo USING archives a
         WHERE a.id=fo.archive_id AND a.code='ДАХО' AND fo.code=$1
           AND coalesce(fo.title,'')=''
           AND NOT EXISTS (SELECT 1 FROM inventories i WHERE i.fond_id=fo.id)
         RETURNING fo.code`,
        [anom.fond],
      );
      await client.query(
        `UPDATE mig_daho_page_fix SET deleted_fond=$1 WHERE old_full_code=$2 AND deleted_fond IS NULL`,
        [(del.rowCount ?? 0) > 0, anom.fullCode],
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);
  const doApply = args.includes('--apply');
  const applyOpOnly = args.includes('--apply-op-only');
  const ocrPaths = args.filter((a) => !a.startsWith('--'));
  if (!ocrPaths.length) ocrPaths.push('mbv5-b1.txt');

  const books = parseOcr(ocrPaths);
  books.forEach((b, i) =>
    console.log(`${ocrPaths[i]}: ${b.size} page breaks (pages ${Math.min(...b.keys())}–${Math.max(...b.keys())})`));

  const anomalies = await loadAnomalies();
  console.log(`ДАХО anomalies loaded: ${anomalies.length}\n`);

  const fixes: { anom: Anom; trueFond: string; status: string }[] = [];
  const reportLines = ['full_code,status,true_fond,files,evidence_before,evidence_after'];

  for (const anom of anomalies.sort((a, b) => a.fullCode.localeCompare(b.fullCode))) {
    const v = judge(anom, books);
    const fileCodes = anom.files.map((f) => f.code).join(' ');
    const ev = 'br' in v && v.br ? v.br : undefined;
    reportLines.push(
      [
        anom.fullCode,
        v.status,
        'trueFond' in v ? v.trueFond : '',
        `"${fileCodes}"`,
        `"${(ev?.beforeSnippet ?? '').replace(/"/g, "'")}"`,
        `"${(ev?.afterSnippet ?? '').replace(/"/g, "'")}"`,
      ].join(','),
    );
    const mark =
      v.status === 'exact' ? '✓' : v.status === 'op-only' ? '~' : '✗';
    console.log(
      `${mark} ${anom.fullCode} [${fileCodes}] → ${'trueFond' in v ? `ДАХО-${v.trueFond}-${anom.inv}` : v.status}` +
        (v.status === 'op-only' ? ' (op-only)' : ''),
    );
    if (v.status === 'exact' || (v.status === 'op-only' && applyOpOnly)) {
      fixes.push({ anom, trueFond: v.trueFond, status: v.status });
    }
  }

  writeFileSync(REPORT_CSV, reportLines.join('\n') + '\n');
  console.log(`\nreport: ${REPORT_CSV}`);
  console.log(`fixable now: ${fixes.length}/${anomalies.length} (${doApply ? 'APPLYING' : 'dry-run, use --apply'})`);

  if (doApply && fixes.length) {
    await apply(fixes);
    // strip fixed rows from the review CSV
    const fixed = new Set(fixes.map((f) => f.anom.fullCode));
    const kept = readFileSync(REVIEW_CSV, 'utf8')
      .split('\n')
      .filter((l, idx) => idx === 0 || !fixed.has(l.split(',')[0]));
    writeFileSync(REVIEW_CSV, kept.join('\n'));
    console.log(`applied ${fixes.length} fixes; ${REVIEW_CSV} updated; audit in mig_daho_page_fix`);
  }
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
