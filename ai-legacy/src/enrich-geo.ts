/**
 * Author location enrichment — approved design 2026-07-23:
 * historical church/place names → Gemini (modern settlement + область + район +
 * confidence) → Nominatim geocoding (free OSM, 1 req/s policy) → authors.lat/lng.
 *
 *   pnpm exec tsx -r dotenv/config ai-legacy/src/enrich-geo.ts [--limit N] [--dry-run]
 *
 * Pipeline (all stages resumable — LLM + geocode results are disk-cached):
 *  1. work table mig_geo: every author without coords; exact-phrase grouping
 *     (location part of the title + ЗКМК place/state) so one identification
 *     serves all churches of a settlement;
 *  2. Gemini per group (batch 10, gemini-3.5-flash): modern name, область,
 *     район, confidence 0-100, note → mig_geo_ident;
 *  3. Nominatim per distinct (name, район, область) triple, conf ≥ 70 only:
 *     settlement-typed hit whose display_name confirms the AI's область →
 *     mig_geo_coords (1.1 s between calls, UA header per usage policy);
 *  4. write authors.lat/lng for verified hits; everything else →
 *     out/geo/review.csv with the AI's reasoning;
 *  5. merge-candidates.csv: authors that landed on identical coords with
 *     near-identical titles (ЗКМК spelling variants) — editor merge queue.
 *
 * --dry-run rolls back DB writes (LLM/geocode caches still fill, so the
 * following real run is nearly free). Audit in ai-legacy/out/geo/.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';
import { Pool, PoolClient } from 'pg';

const CONF_THRESHOLD = 70;
const BATCH = 10;
const AI_CONCURRENCY = Number(process.env.AI_CONCURRENCY ?? 4);
const OUT_DIR = path.join('ai-legacy', 'out', 'geo');
const CACHE_DIR = path.join(OUT_DIR, 'cache');

const pool = new Pool({
  connectionString: (process.env.AI_LEGACY_DATABASE_URL ?? process.env.DATABASE_URL ?? '').replace(/\?schema=[^&]*(&|$)/, ''),
  max: 4,
});

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
});
let llmCalls = 0;
let llmIn = 0;
let llmOut = 0;

const stats: Record<string, number> = {};
const bump = (k: string, by = 1): void => {
  stats[k] = (stats[k] ?? 0) + by;
};
const md5 = (s: string): string => createHash('md5').update(s).digest('hex');
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const csvEscape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const readCache = <T>(file: string): T | null => {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as T;
  } catch {
    return null;
  }
};

// ── LLM identification ─────────────────────────────────────────────────────

interface GroupRow {
  group_key: string;
  title: string;
  place: string | null;
  state: string | null;
}

interface Ident {
  id: string;
  modern_name: string;
  oblast: string;
  raion: string | null;
  confidence: number;
  note: string;
}

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['rows'],
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'modern_name', 'oblast', 'raion', 'confidence', 'note'],
        properties: {
          id: { type: 'string' },
          modern_name: { type: 'string', description: 'сучасна українська назва населеного пункту' },
          oblast: { type: 'string', description: 'сучасна область України (або країна, якщо поза Україною)' },
          raion: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'сучасний район (після реформи 2020), null якщо невідомо' },
          confidence: { type: 'integer', description: '0-100' },
          note: { type: 'string', description: 'коротке пояснення' },
        },
      },
    },
  },
};

const SYSTEM = `Ти — експерт з історичної географії України. На вхід — церква/установа з історичною локалізацією (назви часів Російської імперії / Австро-Угорщини / міжвоєнні: повіти, волості, губернії, жупи, воєводства) та, якщо є, назва населеного пункту з друкованого каталогу 2000-х років.

Для кожного рядка визнач СУЧАСНИЙ населений пункт:
- сучасна українська назва (село могло бути перейменоване, приєднане до міста, затоплене чи зникле — поясни в note);
- сучасна область; сучасний район (після реформи 2020 р.);
- confidence 0-100: 90+ тільки коли населений пункт однозначно ідентифікується; якщо назва поширена і контекст не дозволяє розрізнити — знижуй і поясни.
Не вигадуй: якщо ідентифікувати неможливо, confidence < 30 і поясни чому.`;

const isParseError = (err: unknown): boolean => err instanceof SyntaxError;

const callGemini = async (batch: GroupRow[]): Promise<Ident[]> => {
  const user = `Установи з історичною локалізацією:\n${JSON.stringify(
    batch.map((g) => ({ id: g.group_key, назва: g.title, нп_з_каталогу_2000х: g.place, губернія: g.state })),
    null,
    1,
  )}`;
  for (let attempt = 1; ; attempt += 1) {
    try {
      const res = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL_BULK ?? 'gemini-3.5-flash',
        contents: user,
        config: { systemInstruction: SYSTEM, responseMimeType: 'application/json', responseJsonSchema: SCHEMA, maxOutputTokens: 16384 },
      });
      llmCalls += 1;
      llmIn += res.usageMetadata?.promptTokenCount ?? 0;
      llmOut += (res.usageMetadata?.candidatesTokenCount ?? 0) + (res.usageMetadata?.thoughtsTokenCount ?? 0);
      const parsed = JSON.parse(res.text ?? '') as { rows?: Ident[] };
      return Array.isArray(parsed.rows) ? parsed.rows : [];
    } catch (err) {
      const status = (err as { status?: number }).status;
      const retryable = status === 429 || status === 500 || status === 502 || status === 503 || isParseError(err);
      if (!retryable || attempt >= (isParseError(err) ? 3 : 8)) throw err;
      await sleep(Math.min(60_000, 2000 * 2 ** attempt));
    }
  }
};

/** Batch with disk cache + bisect on persistently malformed JSON. */
const identifyGroups = async (batch: GroupRow[]): Promise<Ident[]> => {
  const cacheFile = path.join(CACHE_DIR, 'ident', `${md5(JSON.stringify(batch.map((b) => b.group_key)))}.json`);
  const cached = readCache<Ident[]>(cacheFile);
  if (cached) return cached;
  let rows: Ident[];
  try {
    rows = await callGemini(batch);
  } catch (err) {
    if (!isParseError(err) || batch.length <= 1) {
      if (isParseError(err) && batch.length === 1) {
        bump('ai_parse_failures');
        return [];
      }
      throw err;
    }
    const mid = Math.ceil(batch.length / 2);
    rows = [...(await identifyGroups(batch.slice(0, mid))), ...(await identifyGroups(batch.slice(mid)))];
  }
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(rows, null, 1));
  return rows;
};

const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> => {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
      while (next < items.length) {
        const i = next;
        next += 1;
        results[i] = await fn(items[i], i);
      }
    }),
  );
  return results;
};

// ── Nominatim ──────────────────────────────────────────────────────────────

interface GeoResult {
  lat: number;
  lon: number;
  display_name: string;
  addresstype: string;
  verified: boolean;
}

const SETTLEMENT_TYPES = new Set(['city', 'town', 'village', 'hamlet', 'suburb', 'municipality', 'isolated_dwelling']);

const nominatimOnce = async (q: string): Promise<{ lat: string; lon: string; display_name: string; addresstype: string; category: string }[]> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=3&accept-language=uk&countrycodes=ua&featureType=settlement&q=${encodeURIComponent(q)}`;
  for (let attempt = 1; ; attempt += 1) {
    const res = await fetch(url, { headers: { 'User-Agent': 'duckarchive-inspector/1.0 (author geo enrichment; alexandrtovmach@gmail.com)' } });
    if (res.ok) return (await res.json()) as never;
    if (attempt >= 4) throw new Error(`nominatim ${res.status} for "${q}"`);
    await sleep(5000 * attempt);
  }
};

const geocode = async (modern: string, raion: string | null, oblast: string): Promise<GeoResult | null> => {
  const key = md5(`${modern}|${raion}|${oblast}`);
  const cacheFile = path.join(CACHE_DIR, 'geo', `${key}.json`);
  const cached = readCache<GeoResult | { miss: true }>(cacheFile);
  if (cached) return 'miss' in cached ? null : cached;

  const oblastNorm = oblast.toLowerCase().replace(/\s*область\s*/g, '').trim();
  const queries = [raion ? `${modern}, ${raion} район, ${oblast}` : null, `${modern}, ${oblast}`].filter(Boolean) as string[];
  let result: GeoResult | null = null;
  for (const q of queries) {
    await sleep(1100); // Nominatim usage policy: max 1 req/s
    const hits = await nominatimOnce(q);
    const hit = hits.find((h) => SETTLEMENT_TYPES.has(h.addresstype));
    if (hit) {
      const verified = hit.display_name.toLowerCase().includes(oblastNorm);
      result = { lat: Number(hit.lat), lon: Number(hit.lon), display_name: hit.display_name, addresstype: hit.addresstype, verified };
      if (verified) break; // oblast-confirmed — done; otherwise try the next query form
    }
  }
  mkdirSync(path.dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(result ?? { miss: true }, null, 1));
  return result;
};

// ── main ───────────────────────────────────────────────────────────────────

const main = async (): Promise<void> => {
  const dryRun = process.argv.includes('--dry-run');
  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx >= 0 ? Number(process.argv[limitIdx + 1]) : undefined;
  mkdirSync(CACHE_DIR, { recursive: true });

  const client: PoolClient = await pool.connect();
  const startedAt = Date.now();
  try {
    // ── 1. work table: authors → location groups ─────────────────────────
    await client.query(`
      DROP TABLE IF EXISTS mig_geo;
      CREATE TABLE mig_geo AS
      WITH church_loc AS (
        SELECT church_name,
               mode() WITHIN GROUP (ORDER BY place) FILTER (WHERE place IS NOT NULL AND place <> '–') AS place,
               mode() WITHIN GROUP (ORDER BY state) AS state
        FROM mig_acmb WHERE church_name IS NOT NULL GROUP BY church_name
      )
      SELECT a.id AS author_id, a.title, cl.place, cl.state
      FROM authors a
      LEFT JOIN church_loc cl ON cl.church_name = a.title
      WHERE a.lat IS NULL OR a.lng IS NULL`);
    // group key: the location phrase (title after the first comma — «с. Y Xського пов.»),
    // or the whole title when it has none, plus ЗКМК place/state; exact match only
    await client.query(`
      ALTER TABLE mig_geo ADD COLUMN group_key text;
      UPDATE mig_geo SET group_key = md5(
        lower(regexp_replace(coalesce(nullif(substring(title from ',(.*)$'), ''), title), '\\s+', ' ', 'g'))
        || '|' || coalesce(lower(place), '') || '|' || coalesce(lower(state), ''));
      CREATE INDEX ON mig_geo (group_key)`);

    const groups = await client.query<GroupRow>(`
      SELECT DISTINCT ON (group_key) group_key, title, place, state
      FROM mig_geo ORDER BY group_key, title ${limit ? `LIMIT ${limit}` : ''}`);
    const authorsTotal = await client.query('SELECT count(*)::int AS n FROM mig_geo');
    bump('authors_without_coords', authorsTotal.rows[0].n);
    bump('location_groups', groups.rows.length);
    console.log(`authors without coords: ${authorsTotal.rows[0].n}, location groups${limit ? ` (limited)` : ''}: ${groups.rows.length}`);

    // ── 2. Gemini identification ─────────────────────────────────────────
    const batches: GroupRow[][] = [];
    for (let i = 0; i < groups.rows.length; i += BATCH) batches.push(groups.rows.slice(i, i + BATCH));
    await client.query(`
      DROP TABLE IF EXISTS mig_geo_ident;
      CREATE TABLE mig_geo_ident (
        group_key text PRIMARY KEY, modern_name text, oblast text, raion text,
        confidence int, note text)`);
    let done = 0;
    await mapLimit(batches, AI_CONCURRENCY, async (batch) => {
      const rows = await identifyGroups(batch);
      const byId = new Map(rows.map((r) => [r.id, r]));
      for (const g of batch) {
        const r = byId.get(g.group_key);
        if (!r) {
          bump('ai_dropped_rows');
          continue;
        }
        await pool.query(
          `INSERT INTO mig_geo_ident (group_key, modern_name, oblast, raion, confidence, note)
           VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (group_key) DO NOTHING`,
          [g.group_key, r.modern_name, r.oblast, r.raion, r.confidence, r.note],
        );
      }
      done += 1;
      if (done % 50 === 0) console.log(`  [ident ${done}/${batches.length}] llm ≈ $${((llmIn * 1.5 + llmOut * 9) / 1e6).toFixed(2)}`);
    });
    const identStats = await client.query<{ n: string; ok: string }>(
      `SELECT count(*)::text AS n, count(*) FILTER (WHERE confidence >= ${CONF_THRESHOLD})::text AS ok FROM mig_geo_ident`,
    );
    bump('identified', Number(identStats.rows[0].n));
    bump('identified_confident', Number(identStats.rows[0].ok));
    console.log(`identified: ${identStats.rows[0].n} (${identStats.rows[0].ok} with confidence ≥ ${CONF_THRESHOLD})`);

    // ── 3. geocode distinct confident triples ────────────────────────────
    const triples = await client.query<{ modern_name: string; oblast: string; raion: string | null }>(
      `SELECT DISTINCT modern_name, oblast, raion FROM mig_geo_ident WHERE confidence >= ${CONF_THRESHOLD}`,
    );
    console.log(`geocoding ${triples.rows.length} distinct settlements (~${Math.round((triples.rows.length * 1.3 * 1.1) / 60)} min at 1 req/s)…`);
    await client.query(`
      DROP TABLE IF EXISTS mig_geo_coords;
      CREATE TABLE mig_geo_coords (
        modern_name text, oblast text, raion text, lat double precision, lon double precision,
        display_name text, verified boolean)`);
    let geoDone = 0;
    for (const t of triples.rows) {
      const hit = await geocode(t.modern_name, t.raion, t.oblast);
      if (hit) {
        await client.query(
          `INSERT INTO mig_geo_coords (modern_name, oblast, raion, lat, lon, display_name, verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [t.modern_name, t.oblast, t.raion, hit.lat, hit.lon, hit.display_name, hit.verified],
        );
        bump(hit.verified ? 'geocoded_verified' : 'geocoded_unverified');
      } else bump('geocode_miss');
      geoDone += 1;
      if (geoDone % 200 === 0) console.log(`  [geo ${geoDone}/${triples.rows.length}]`);
    }

    // ── 4. write coords + review queue ───────────────────────────────────
    await client.query('BEGIN');
    // one winner per (title, coords): the authors table is unique on [title, lat, lng],
    // so exact-duplicate authors get coords on one row only — the rest go to the
    // merge queue below
    const written = await client.query(`
      UPDATE authors a SET lat = w.lat, lng = w.lon
      FROM (
        SELECT DISTINCT ON (a2.title, c.lat, c.lon) a2.id, a2.title, c.lat, c.lon
        FROM mig_geo g
        JOIN authors a2 ON a2.id = g.author_id AND (a2.lat IS NULL OR a2.lng IS NULL)
        JOIN mig_geo_ident i ON i.group_key = g.group_key AND i.confidence >= ${CONF_THRESHOLD}
        JOIN mig_geo_coords c ON c.modern_name = i.modern_name AND c.oblast = i.oblast
          AND c.raion IS NOT DISTINCT FROM i.raion AND c.verified
        ORDER BY a2.title, c.lat, c.lon, a2.id
      ) w
      WHERE a.id = w.id
        AND NOT EXISTS (
          SELECT 1 FROM authors x
          WHERE x.id <> w.id AND x.title = w.title AND x.lat = w.lat AND x.lng = w.lon)`);
    bump('authors_coords_written', written.rowCount ?? 0);

    const reviewCsv = path.join(OUT_DIR, `review${dryRun ? '.dry-run' : ''}.csv`);
    writeFileSync(reviewCsv, 'reason,author,ai_name,ai_raion,ai_oblast,confidence,note\n');
    const review = await client.query<{ reason: string; title: string; modern_name: string | null; raion: string | null; oblast: string | null; confidence: number | null; note: string | null }>(`
      SELECT CASE
               WHEN i.group_key IS NULL THEN 'no-identification'
               WHEN i.confidence < ${CONF_THRESHOLD} THEN 'low-confidence'
               WHEN c.modern_name IS NULL THEN 'geocode-miss'
               ELSE 'duplicate-title-skipped'
             END AS reason,
             g.title, i.modern_name, i.raion, i.oblast, i.confidence, i.note
      FROM mig_geo g
      LEFT JOIN mig_geo_ident i ON i.group_key = g.group_key
      LEFT JOIN mig_geo_coords c ON c.modern_name = i.modern_name AND c.oblast = i.oblast
        AND c.raion IS NOT DISTINCT FROM i.raion AND c.verified
      JOIN authors a ON a.id = g.author_id
      WHERE (a.lat IS NULL OR a.lng IS NULL) ${limit ? 'AND i.group_key IS NOT NULL' : ''}`);
    for (const r of review.rows) {
      appendFileSync(reviewCsv, [r.reason, r.title, r.modern_name ?? '', r.raion ?? '', r.oblast ?? '', String(r.confidence ?? ''), r.note ?? ''].map(csvEscape).join(',') + '\n');
    }
    bump('authors_for_review', review.rows.length);

    // ── 5. merge candidates: identical coords + near-identical titles ────
    const mergeCsv = path.join(OUT_DIR, `merge-candidates${dryRun ? '.dry-run' : ''}.csv`);
    writeFileSync(mergeCsv, 'author_a,author_b,similarity,lat,lng\n');
    const dups = await client.query<{ ta: string; tb: string; sim: number; lat: number | null; lng: number | null }>(`
      SELECT a.title AS ta, b.title AS tb, similarity(a.title, b.title) AS sim, a.lat, a.lng
      FROM authors a
      JOIN authors b ON a.id < b.id AND a.lat = b.lat AND a.lng = b.lng
      WHERE a.lat IS NOT NULL AND similarity(a.title, b.title) > 0.9
      UNION
      SELECT a.title, b.title, 1.0, a.lat, a.lng
      FROM authors a
      JOIN authors b ON a.id < b.id AND a.title = b.title`);
    for (const d of dups.rows) {
      appendFileSync(mergeCsv, [d.ta, d.tb, d.sim.toFixed(2), String(d.lat), String(d.lng)].map(csvEscape).join(',') + '\n');
    }
    bump('merge_candidate_pairs', dups.rows.length);

    if (dryRun) {
      await client.query('ROLLBACK');
      console.log('\nDRY RUN — coordinate writes rolled back (caches and work tables kept).');
    } else {
      await client.query('COMMIT');
    }

    const cost = (llmIn * 1.5 + llmOut * 9) / 1e6;
    const lines = [
      '# Author geo enrichment (Gemini + Nominatim)',
      '',
      `Generated: ${new Date().toISOString()}${dryRun ? ' (DRY RUN)' : ''}${limit ? ` (LIMIT ${limit})` : ''}`,
      '',
      '| stat | value |',
      '|---|---:|',
      ...Object.entries(stats).sort().map(([k, v]) => `| ${k} | ${v.toLocaleString()} |`),
      '',
      `LLM: ${llmCalls} calls, in ${llmIn.toLocaleString()} tok, out ${llmOut.toLocaleString()} tok ≈ $${cost.toFixed(2)}`,
      '',
      'Review queue: `review.csv`; possible duplicate authors: `merge-candidates.csv`.',
      '',
    ];
    writeFileSync(path.join(OUT_DIR, `report${dryRun ? '.dry-run' : ''}.md`), lines.join('\n'));
    console.log(`\nDone in ${((Date.now() - startedAt) / 60_000).toFixed(1)} min. LLM ≈ $${cost.toFixed(2)}. Report in ${OUT_DIR}/`);
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
