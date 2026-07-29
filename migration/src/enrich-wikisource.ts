/**
 * Wikisource catalog enrichment (2026-07-28).
 * Modified scraper based on scrapper/src/plugins/wikisource — instead of just
 * page titles + scan links, it fetches full wikitext and parses the catalog
 * TABLES and entity templates:
 *
 *   Архів:<ARCH>/<PREFIX>      (Д/Р/П/…)  → fonds table: [[../Р-1/]] || назва || роки || справ
 *   Архів:<ARCH>/<FOND>                    → {{Архіви/фонд назва рік}} + описи table
 *   Архів:<ARCH>/<FOND>/<INV>              → {{Архіви/опис назва рік}} + справи table:
 *                                            [[/212/]] || назва || роки || аркушів
 *   Архів:<ARCH>/<FOND>/<INV>/<SPR>        → {{Архіви/справа назва рік}} (leaf)
 *
 * Enrichment policy (2026-07-28, incl. data-owner amendment):
 *   - fonds: create missing (with title), fill empty titles (never override);
 *   - описи: create missing (title only if not the trivial «Опис N»), dotless
 *     codes (data-owner rule), inventory_years insert only when the опис has none;
 *   - files: create missing (title + years), fill empty titles, file_years only
 *     when the file has none;
 *   - OVERRIDE amendment: an existing file/опис title MAY be overwritten by the
 *     wiki title when the current title is duplicated across its siblings
 *     (same опис for files / same fond for описи) — the FamilySearch-style
 *     placeholder pattern («Метрична книга. Церква…» repeated N times).
 *     Unique titles are never touched. Old value kept in audit.old_title.
 *   - Audit table mig_wikisource_enrich kept permanently.
 *
 * Usage:
 *   pnpm exec tsx migration/src/enrich-wikisource.ts --fetch [ARCH …]   # scrape to cache
 *   pnpm exec tsx migration/src/enrich-wikisource.ts [ARCH …]           # parse → staging → set-based SQL enrich (single run)
 * Cache: migration/out/wikisource/pages-<ARCH>.json
 * Set-based enrichment SQL: migration/wikisource-enrich.sql (one transaction, audits + assertions inside).
 * DB: postgres:///inspector_3 (override MIGRATION_DATABASE_URL).
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString:
    process.env.MIGRATION_DATABASE_URL || 'postgres:///inspector_3?host=/var/run/postgresql',
  max: 2,
});

const API = 'https://uk.wikisource.org/w/api.php';
const UA = 'DuckInspectorBot/migration (https://inspector.duckarchive.com/;admin@duckarchive.com)';
const OUT = 'migration/out/wikisource';
const REQUEST_DELAY_MS = 250;
const MAX_RETRIES = 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------- fetch ----------------

async function fetchArchivePages(arch: string): Promise<Record<string, string>> {
  const pages: Record<string, string> = {};
  let gapcontinue = '';
  let batch = 0;
  do {
    for (let attempt = 1; ; attempt++) {
      const params = new URLSearchParams({
        action: 'query', format: 'json', formatversion: '2',
        generator: 'allpages', gapnamespace: '116', gapprefix: `${arch}/`, gaplimit: '50',
        prop: 'revisions', rvprop: 'content', rvslots: 'main', maxlag: '5',
        ...(gapcontinue && { gapcontinue }),
      });
      const res = await fetch(`${API}?${params}`, {
        headers: { 'User-Agent': UA, 'Accept-Encoding': 'gzip' },
      });
      if (res.status === 429 || res.status === 503) {
        if (attempt >= MAX_RETRIES) throw new Error(`HTTP ${res.status} after ${attempt} attempts`);
        const ra = Number(res.headers.get('retry-after'));
        await sleep(Number.isFinite(ra) && ra > 0 ? ra * 1000 : Math.min(5000 * 2 ** (attempt - 1), 60000));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${arch}`);
      const data: any = await res.json();
      for (const p of data.query?.pages ?? []) {
        pages[p.title] = p.revisions?.[0]?.slots.main.content || '';
      }
      gapcontinue = data.continue?.gapcontinue ?? '';
      break;
    }
    if (++batch % 20 === 0) console.log(`  ${arch}: ${Object.keys(pages).length} pages…`);
    await sleep(REQUEST_DELAY_MS);
  } while (gapcontinue);
  return pages;
}

// ---------------- parsing ----------------

/** strip invisible chars (word-joiner &c), collapse whitespace */
const clean = (s: string) =>
  s.replace(/[⁠​­﻿]/g, '').replace(/\s+/g, ' ').trim();

/** «Р-1» / «/212/» / «../Р-1/» → canonical code: Р1, 212 (upper, dotless, dash-collapsed) */
function canonCode(raw: string): string | null {
  const s = clean(raw).replace(/^[./[\]]+|[./[\]]+$/g, '').replace(/\./g, '');
  if (!s) return null;
  const m = s.toUpperCase().match(/^([А-ЯҐЄІЇA-Z]{0,3})\s*[-–—]?\s*(\d+.*)$/);
  if (!m) return null;
  return (m[1] + m[2]).replace(/[-–—\s]/g, '');
}

function parseYears(raw: string): [number, number][] {
  const out: [number, number][] = [];
  for (const tok of clean(raw).split(',')) {
    const m = tok.match(/(\d{4})\s*[-–—]\s*(\d{4})/) || tok.match(/(\d{4})/);
    if (!m) continue;
    const a = parseInt(m[1], 10);
    const b = m[2] ? parseInt(m[2], 10) : a;
    if (a >= 1200 && b >= a && b <= 2035) out.push([a, b]);
  }
  return out;
}

/** template param: {{Архіви/фонд | назва = X | рік = Y }} */
function templateParam(wikitext: string, param: string): string | null {
  const m = wikitext.match(new RegExp(`\\|\\s*${param}\\s*=\\s*([^|}]*)`));
  const v = m ? clean(m[1]) : '';
  return v || null;
}

interface Row { code: string; title: string | null; years: [number, number][] }

/** parse all wikitable rows: first cell = code link, then назва, роки */
function parseTableRows(wikitext: string): Row[] {
  const rows: Row[] = [];
  for (const table of wikitext.split('{|').slice(1)) {
    const body = table.split('|}')[0];
    for (const rawRow of body.split(/^\|-.*$/m).slice(1)) {
      const line = rawRow.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|') && !l.startsWith('|}'))
        .join('||').replace(/^\|/, '');
      if (!line) continue;
      const cells = line.split('||').map((c) => c.replace(/^\|/, '').trim());
      if (cells.length < 2) continue;
      // code from [[…]] link or plain text
      const linkM = cells[0].match(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/);
      const code = canonCode(linkM ? linkM[1] : cells[0]);
      if (!code) continue;
      const title = clean((cells[1] || '').replace(/\[\[([^\]|]+\|)?([^\]]*)\]\]/g, '$2').replace(/'{2,}/g, ''));
      const years = cells.length > 2 ? parseYears(cells[2]) : [];
      rows.push({ code, title: title || null, years });
    }
  }
  return rows;
}

interface Parsed {
  arch: string;
  fonds: Map<string, { title: string | null; fromTemplate: boolean }>;
  invs: Map<string, { fond: string; code: string; title: string | null; years: [number, number][] }>;
  files: Map<string, { fond: string; inv: string; code: string; title: string | null; years: [number, number][] }>;
}

function parseArchive(arch: string, pages: Record<string, string>): Parsed {
  const P: Parsed = { arch, fonds: new Map(), invs: new Map(), files: new Map() };
  const setFond = (code: string, title: string | null, fromTemplate = false) => {
    const cur = P.fonds.get(code);
    if (!cur || (!cur.title && title)) P.fonds.set(code, { title: title ?? cur?.title ?? null, fromTemplate });
  };
  const setInv = (fond: string, code: string, title: string | null, years: [number, number][]) => {
    const k = `${fond}-${code}`;
    const cur = P.invs.get(k);
    if (!cur) P.invs.set(k, { fond, code, title, years });
    else {
      if (!cur.title && title) cur.title = title;
      if (!cur.years.length && years.length) cur.years = years;
    }
  };
  const setFile = (fond: string, inv: string, code: string, title: string | null, years: [number, number][]) => {
    const k = `${fond}-${inv}-${code}`;
    const cur = P.files.get(k);
    if (!cur) P.files.set(k, { fond, inv, code, title, years });
    else {
      if (!cur.title && title) cur.title = title;
      if (!cur.years.length && years.length) cur.years = years;
    }
  };

  for (const [title, text] of Object.entries(pages)) {
    const parts = title.split('/').slice(1); // drop "Архів:<ARCH>"
    if (!parts.length) continue;

    if (parts.length === 1 && /^[А-ЯҐЄІЇ]{1,3}$/.test(parts[0])) {
      // prefix page (Д, Р, П, …): fonds table
      for (const row of parseTableRows(text)) setFond(row.code, row.title);
      continue;
    }

    const fond = canonCode(parts[0]);
    if (!fond) continue;

    if (parts.length === 1) {
      // fond page: own template + описи table
      if (text.includes('{{Архіви/фонд')) setFond(fond, templateParam(text, 'назва'), true);
      for (const row of parseTableRows(text)) {
        setInv(fond, row.code, /^ОПИС\s*\d+$/i.test(row.title ?? '') ? null : row.title, row.years);
      }
    } else if (parts.length === 2) {
      // опис page: справи table (template назва = fond's title, not опис's)
      const inv = canonCode(parts[1]);
      if (!inv) continue;
      setInv(fond, inv, null, []);
      if (text.includes('{{Архіви/фонд') || text.includes('{{Архіви/опис')) {
        setFond(fond, templateParam(text, 'назва'));
      }
      for (const row of parseTableRows(text)) setFile(fond, inv, row.code, row.title, row.years);
    } else if (parts.length === 3) {
      // справа page: own template
      const inv = canonCode(parts[1]);
      const spr = canonCode(parts[2]);
      if (!inv || !spr) continue;
      if (text.includes('{{Архіви/справа')) {
        setFile(fond, inv, spr, templateParam(text, 'назва'), parseYears(templateParam(text, 'рік') ?? ''));
      }
    }
  }
  return P;
}

// ---------------- staging load + set-based SQL ----------------

async function batchInsert(table: string, cols: string[], rows: any[][]) {
  const B = 1000;
  for (let i = 0; i < rows.length; i += B) {
    const chunk = rows.slice(i, i + B);
    const values: any[] = [];
    const ph = chunk.map((row, ri) => {
      row.forEach((v) => values.push(v));
      const base = ri * cols.length;
      return '(' + cols.map((_, ci) => `$${base + ci + 1}`).join(',') + ')';
    }).join(',');
    await pool.query(`INSERT INTO ${table} (${cols.join(',')}) VALUES ${ph}`, values);
  }
}

async function loadStaging(parsedList: Parsed[]) {
  await pool.query(`
    DROP TABLE IF EXISTS mig_wiki_stage_fonds, mig_wiki_stage_invs, mig_wiki_stage_files,
                         mig_wiki_stage_inv_years, mig_wiki_stage_file_years;
    CREATE UNLOGGED TABLE mig_wiki_stage_fonds (arch text, code text, title text);
    CREATE UNLOGGED TABLE mig_wiki_stage_invs  (arch text, fond text, code text, title text);
    CREATE UNLOGGED TABLE mig_wiki_stage_files (arch text, fond text, inv text, code text, title text);
    CREATE UNLOGGED TABLE mig_wiki_stage_inv_years  (arch text, fond text, code text, y1 int, y2 int);
    CREATE UNLOGGED TABLE mig_wiki_stage_file_years (arch text, fond text, inv text, code text, y1 int, y2 int);
  `);
  const fonds: any[][] = [], invs: any[][] = [], files: any[][] = [];
  const invYears: any[][] = [], fileYears: any[][] = [];
  for (const P of parsedList) {
    for (const [code, f] of P.fonds) fonds.push([P.arch, code, f.title]);
    for (const v of P.invs.values()) {
      invs.push([P.arch, v.fond, v.code, v.title]);
      for (const [a, b] of v.years) invYears.push([P.arch, v.fond, v.code, a, b]);
    }
    for (const v of P.files.values()) {
      files.push([P.arch, v.fond, v.inv, v.code, v.title]);
      for (const [a, b] of v.years) fileYears.push([P.arch, v.fond, v.inv, v.code, a, b]);
    }
  }
  await batchInsert('mig_wiki_stage_fonds', ['arch','code','title'], fonds);
  await batchInsert('mig_wiki_stage_invs', ['arch','fond','code','title'], invs);
  await batchInsert('mig_wiki_stage_files', ['arch','fond','inv','code','title'], files);
  await batchInsert('mig_wiki_stage_inv_years', ['arch','fond','code','y1','y2'], invYears);
  await batchInsert('mig_wiki_stage_file_years', ['arch','fond','inv','code','y1','y2'], fileYears);
  console.log(`staging loaded: fonds ${fonds.length}, invs ${invs.length}, files ${files.length}, inv_years ${invYears.length}, file_years ${fileYears.length}`);
}


async function main() {
  const args = process.argv.slice(2);
  const doFetch = args.includes('--fetch');
  const stageOnly = args.includes('--stage-only');
  const archArgs = args.filter((a) => !a.startsWith('--'));
  mkdirSync(OUT, { recursive: true });

  if (doFetch) {
    let archives = archArgs;
    if (!archives.length) {
      const { rows } = await pool.query(
        `SELECT DISTINCT a.code FROM sync_tasks st JOIN archives a ON a.id=st.archive_id
         WHERE st.api_url LIKE '%wikisource%' ORDER BY 1`);
      archives = rows.map((r: any) => r.code);
    }
    console.log(`fetching ${archives.length} archives: ${archives.join(', ')}`);
    for (const arch of archives) {
      const cache = `${OUT}/pages-${arch}.json`;
      if (existsSync(cache)) { console.log(`${arch}: cached, skip`); continue; }
      const pages = await fetchArchivePages(arch);
      writeFileSync(cache, JSON.stringify(pages));
      console.log(`${arch}: ${Object.keys(pages).length} pages fetched`);
    }
    await pool.end();
    return;
  }

  const parsedList: Parsed[] = [];
  for (const f of readdirSync(OUT).filter((f) => f.startsWith('pages-') && f.endsWith('.json'))) {
    const arch = f.slice(6, -5);
    if (archArgs.length && !archArgs.includes(arch)) continue;
    const pages = JSON.parse(readFileSync(`${OUT}/${f}`, 'utf8'));
    const P = parseArchive(arch, pages);
    console.log(`${arch}: ${Object.keys(pages).length} pages → fonds ${P.fonds.size}, invs ${P.invs.size}, files ${P.files.size}`);
    parsedList.push(P);
  }

  await loadStaging(parsedList);
  if (stageOnly) { await pool.end(); return; }
  console.log('running set-based enrichment SQL…');
  const sql = readFileSync('migration/wikisource-enrich.sql', 'utf8');
  const res: any = await pool.query(sql);
  const last = Array.isArray(res) ? res[res.length - 1] : res;
  console.log('\nAPPLIED:');
  console.table(last.rows);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
