/**
 * ДАКрО «Анотований реєстр описів» enrichment (2026-07-28).
 * Source: R_rad2-2.pdf → pdftotext -layout → migration/out/dakro-reestr/R_rad2-2.txt
 * (Том 2, Фонди періоду після 1917 року, Книга 2, №№ Р-1003 – Р-2475, Кіровоград 2011).
 *
 * Catalog entry shape (body pages 126–~700, between "АНОТОВАНИЙ РЕЄСТР" and
 * "ПОКАЖЧИК ФОНДІВ"):
 *   Ф. Р - 1019. Бобринецька районна контора зв'язку …   ← fond title (wraps)
 *   Справ: 46; 1913-1925, 1928-1929, 1944-1946 рр.       ← fond totals
 *   Опис 1
 *   Справ: 32; 1913-1925, 1928- 1929 рр.                 ← опис count + years
 *   <annotation paragraphs>                              ← until next Опис/Ф.
 *
 * DB policy (matches earlier enrichments — fill-if-empty, never overwrite):
 *   - fond missing → create (code 'Р<N>', title from catalog);
 *     fond exists with empty title → fill; existing titles untouched.
 *   - опис missing → create (code '<K>', title NULL,
 *     info = "Справ: N; <роки> рр.\n\n<annotation>");
 *     опис exists → fill info if empty, title untouched.
 *   - inventory_years: insert parsed ranges only when the опис has 0 year rows.
 *   - audit/work table mig_dakro_reestr kept permanently.
 *
 * Usage:
 *   pnpm exec tsx migration/src/enrich-dakro-reestr.ts             # dry-run
 *   pnpm exec tsx migration/src/enrich-dakro-reestr.ts --apply
 * DB: postgres:///inspector_3 (override MIGRATION_DATABASE_URL).
 */
import { readFileSync, writeFileSync } from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.MIGRATION_DATABASE_URL || 'postgres:///inspector_3?host=/var/run/postgresql',
  max: 2,
});

// All books of the ДАКрО «Анотований реєстр описів» series.
// prefix = DB fond-code prefix ('Р' for radianski/okup books, '' for Том 1
// дорадянські whose DB codes are plain numbers). Header/dash/spacing variants
// per book are handled by one shared regex.
const BOOKS: { txt: string; prefix: string; label: string }[] = [
  { txt: 'migration/out/dakro-reestr/ReestrD_1.txt', prefix: '',  label: 'Том 1 (до 1917)' },
  { txt: 'migration/out/dakro-reestr/R_rad1.txt',    prefix: 'Р', label: 'Том 2 Кн.1' },
  { txt: 'migration/out/dakro-reestr/R_rad2-2.txt',  prefix: 'Р', label: 'Том 2 Кн.2 (Р-1003–2475)' },
  { txt: 'migration/out/dakro-reestr/R_rad2-3.txt',  prefix: 'Р', label: 'Том 2 Кн.3 (Р-2508–3999)' },
  { txt: 'migration/out/dakro-reestr/R_rad2-4.txt',  prefix: 'Р', label: 'Том 2 Кн.4 (Р-4005–6000)' },
  { txt: 'migration/out/dakro-reestr/R_okup.txt',    prefix: 'Р', label: 'Окупаційний період' },
];
const PARSED_JSON = 'migration/out/dakro-reestr/parsed.json';

interface Opys {
  code: string;
  spravCount: number | null;
  yearsRaw: string | null;
  years: [number, number][];
  annotation: string;
}
interface FondEntry {
  code: string; // 'Р1019'
  num: number;
  title: string;
  spravCount: number | null;
  yearsRaw: string | null;
  opysy: Opys[];
  warnings: string[];
}

// ---------- parsing ----------

/** join hyphen-wrapped lines, collapse whitespace */
function joinWrapped(lines: string[]): string {
  let s = '';
  for (const raw of lines) {
    const l = raw.trim();
    if (!l) continue;
    if (s.endsWith('-')) s = s.slice(0, -1) + l;
    else s += (s ? ' ' : '') + l;
  }
  return s.replace(/\s+/g, ' ').trim();
}

function parseYears(raw: string): [number, number][] {
  const out: [number, number][] = [];
  for (const tok of raw.split(',')) {
    const m = tok.match(/(\d{4})\s*-\s*(\d{4})/) || tok.match(/(\d{4})/);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    if (a >= 1600 && b >= a && b <= 2030) out.push([a, b]);
  }
  return out;
}

const SPRAV_RE = /^\s*Справ\s*:?\s*(\d[\d\s]*);?\s*(.*?)\s*(?:рр?\.)?\s*$/;

function parse(TXT: string, prefix: string): FondEntry[] {
  const all = readFileSync(TXT, 'utf8').split('\n');
  const start = all.findIndex((l, i) => i > 100 && l.includes('АНОТОВАНИЙ РЕЄСТР'));
  const end = all.findIndex((l) => l.includes('ПОКАЖЧИК ФОНДІВ'));
  const lines = all.slice(start, end).map((l) => l.replace(/\f/g, ''));

  // drop bare page-number lines and running headers
  const body = lines.filter(
    (l) => !/^\s*\d{1,3}\s*$/.test(l) && !/^\s*АНОТОВАНИЙ РЕЄСТР\s*$/.test(l) && !/^\s*ОПИСІВ\s*$/.test(l) && !/^_+\s*$/.test(l),
  );

  const fonds: FondEntry[] = [];
  // 'Ф. Р - 125.' | 'Ф. Р. - 2211.' | 'Ф. Р – 3999.' | 'Ф. Р-5994.' | 'Ф.Р-7087.' | 'Ф. 99.'
  const fondHeadRe = prefix === 'Р'
    ? /^\s*Ф\.\s*Р\.?\s*[-–]\s*(\d+)\s*\.?\s*(.*)$/
    : /^\s*Ф\.\s*(\d+)\s*\.\s*(.*)$/;
  const opysHeadRe = /^\s*Опис\s*(\d+[А-Яа-яA-Za-z]?)\s*[-–]?\s*$/;

  let i = 0;
  while (i < body.length) {
    const fm = body[i].match(fondHeadRe);
    if (!fm) { i++; continue; }
    const num = parseInt(fm[1], 10);
    const entry: FondEntry = {
      code: prefix + num, num, title: '', spravCount: null, yearsRaw: null, opysy: [], warnings: [],
    };
    // title lines until Справ:
    const titleLines = [fm[2]];
    i++;
    while (i < body.length && !SPRAV_RE.test(body[i]) && !fondHeadRe.test(body[i]) && !opysHeadRe.test(body[i])) {
      titleLines.push(body[i]); i++;
    }
    entry.title = joinWrapped(titleLines);
    const fs = i < body.length ? body[i].match(SPRAV_RE) : null;
    if (fs) {
      entry.spravCount = parseInt(fs[1].replace(/\s/g, ''), 10);
      entry.yearsRaw = fs[2] || null;
      i++;
    } else {
      entry.warnings.push('no fond-level Справ line');
    }
    // описи
    while (i < body.length && !fondHeadRe.test(body[i])) {
      const om = body[i].match(opysHeadRe);
      if (!om) { i++; continue; }
      const op: Opys = { code: om[1], spravCount: null, yearsRaw: null, years: [], annotation: '' };
      i++;
      const os = i < body.length ? body[i].match(SPRAV_RE) : null;
      if (os) {
        op.spravCount = parseInt(os[1].replace(/\s/g, ''), 10);
        op.yearsRaw = os[2] || null;
        op.years = os[2] ? parseYears(os[2]) : [];
        i++;
      } else {
        entry.warnings.push(`опис ${op.code}: no Справ line`);
      }
      // annotation until next Опис / Ф.
      const ann: string[] = [];
      while (i < body.length && !opysHeadRe.test(body[i]) && !fondHeadRe.test(body[i])) {
        ann.push(body[i]); i++;
      }
      // paragraphs: pdftotext keeps indentation; blank line or 5+ space indent = new para
      const paras: string[][] = [];
      for (const l of ann) {
        if (!l.trim()) continue;
        if (/^\s{4,}/.test(l) || !paras.length) paras.push([l]);
        else paras[paras.length - 1].push(l);
      }
      op.annotation = paras.map(joinWrapped).join('\n');
      entry.opysy.push(op);
    }
    if (!entry.opysy.length) entry.warnings.push('no описи parsed');
    fonds.push(entry);
  }
  return fonds;
}

// ---------- apply ----------

async function apply(fonds: FondEntry[]) {
  const client = await pool.connect();
  const stats = {
    fonds_created: 0, fond_titles_filled: 0, invs_created: 0, inv_infos_filled: 0,
    year_rows_added: 0, invs_with_years_added: 0,
  };
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mig_dakro_reestr (
        fond_code text, inv_code text, sprav_count int, years_raw text,
        annotation text, action text, applied_at timestamp DEFAULT now())`);
    const { rows: arch } = await client.query(`SELECT id FROM archives WHERE code='ДАКрО'`);
    const archiveId = arch[0].id;

    for (const f of fonds) {
      let { rows: fr } = await client.query(
        `SELECT id, title FROM fonds WHERE archive_id=$1 AND code=$2`, [archiveId, f.code]);
      let fondId: string;
      if (!fr.length) {
        const ins = await client.query(
          `INSERT INTO fonds (id, code, title, archive_id, updated_at)
           VALUES (gen_random_uuid(), $1, $2, $3, now()) RETURNING id`,
          [f.code, f.title, archiveId]);
        fondId = ins.rows[0].id;
        stats.fonds_created++;
        await client.query(
          `INSERT INTO mig_dakro_reestr (fond_code, inv_code, sprav_count, years_raw, annotation, action)
           VALUES ($1, NULL, $2, $3, $4, 'fond-created')`,
          [f.code, f.spravCount, f.yearsRaw, f.title]);
      } else {
        fondId = fr[0].id;
        if (!fr[0].title || !fr[0].title.trim()) {
          await client.query(`UPDATE fonds SET title=$1, updated_at=now() WHERE id=$2`, [f.title, fondId]);
          stats.fond_titles_filled++;
          await client.query(
            `INSERT INTO mig_dakro_reestr (fond_code, inv_code, annotation, action)
             VALUES ($1, NULL, $2, 'fond-title-filled')`, [f.code, f.title]);
        }
      }

      for (const op of f.opysy) {
        const info =
          `Справ: ${op.spravCount ?? '?'}` + (op.yearsRaw ? `; ${op.yearsRaw} рр.` : '') +
          (op.annotation ? `\n\n${op.annotation}` : '');
        const { rows: ir } = await client.query(
          `SELECT id, info FROM inventories WHERE fond_id=$1 AND code=$2`, [fondId, op.code]);
        let invId: string;
        let action: string;
        if (!ir.length) {
          const ins = await client.query(
            `INSERT INTO inventories (id, code, title, info, fond_id, updated_at)
             VALUES (gen_random_uuid(), $1, NULL, $2, $3, now()) RETURNING id`,
            [op.code, info, fondId]);
          invId = ins.rows[0].id;
          stats.invs_created++;
          action = 'inv-created';
        } else {
          invId = ir[0].id;
          if (!ir[0].info || !ir[0].info.trim()) {
            await client.query(`UPDATE inventories SET info=$1, updated_at=now() WHERE id=$2`, [info, invId]);
            stats.inv_infos_filled++;
            action = 'inv-info-filled';
          } else {
            action = 'inv-exists-skipped';
          }
        }
        if (op.years.length) {
          const { rows: yc } = await client.query(
            `SELECT count(*)::int AS n FROM inventory_years WHERE inventory_id=$1`, [invId]);
          if (yc[0].n === 0) {
            for (const [a, b] of op.years) {
              await client.query(
                `INSERT INTO inventory_years (inventory_id, start_year, end_year) VALUES ($1,$2,$3)
                 ON CONFLICT DO NOTHING`, [invId, a, b]);
              stats.year_rows_added++;
            }
            stats.invs_with_years_added++;
          }
        }
        await client.query(
          `INSERT INTO mig_dakro_reestr (fond_code, inv_code, sprav_count, years_raw, annotation, action)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [f.code, op.code, op.spravCount, op.yearsRaw, op.annotation, action]);
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return stats;
}

// ---------- main ----------

async function main() {
  const doApply = process.argv.includes('--apply');
  const only = process.argv.find((a) => a.startsWith('--book='))?.slice(7);
  const allFonds: FondEntry[] = [];

  for (const book of BOOKS) {
    if (only && !book.txt.includes(only)) continue;
    const fonds = parse(book.txt, book.prefix);
    const nOpys = fonds.reduce((s, f) => s + f.opysy.length, 0);
    const nYears = fonds.reduce((s, f) => s + f.opysy.reduce((t, o) => t + o.years.length, 0), 0);
    const warn = fonds.filter((f) => f.warnings.length);
    const zero = fonds.filter((f) => !f.opysy.length);
    console.log(`\n=== ${book.label} (${book.txt})`);
    console.log(`  fonds: ${fonds.length} (${book.prefix}${Math.min(...fonds.map((f) => f.num))} … ${book.prefix}${Math.max(...fonds.map((f) => f.num))}), описи: ${nOpys}, year ranges: ${nYears}`);
    const mismatch = fonds.filter(
      (f) => f.spravCount != null && f.opysy.every((o) => o.spravCount != null) &&
        f.opysy.reduce((s, o) => s + (o.spravCount ?? 0), 0) !== f.spravCount,
    );
    console.log(`  sum(опис справ) != fond справ: ${mismatch.length}; zero-опис fonds: ${zero.length}`);
    if (warn.length) {
      console.log(`  warnings (${warn.length}):`);
      for (const f of warn.slice(0, 10)) console.log(`    ${f.code}: ${f.warnings.join('; ')}`);
    }
    allFonds.push(...fonds);
  }

  // duplicate fond codes across the whole series (books must not overlap)
  const seen = new Map<string, number>();
  allFonds.forEach((f) => seen.set(f.code, (seen.get(f.code) ?? 0) + 1));
  const dups = [...seen.entries()].filter(([, n]) => n > 1);
  if (dups.length) console.log(`\nDUPLICATE fond codes across books: ${dups.map(([c]) => c).join(', ')}`);

  writeFileSync(PARSED_JSON, JSON.stringify(allFonds, null, 1));
  console.log(`\ntotal: ${allFonds.length} fonds, ${allFonds.reduce((s, f) => s + f.opysy.length, 0)} описи`);

  if (doApply) {
    const stats = await apply(allFonds);
    console.log('\nAPPLIED:', stats);
  } else {
    console.log('dry-run only; use --apply to write to DB');
  }
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
