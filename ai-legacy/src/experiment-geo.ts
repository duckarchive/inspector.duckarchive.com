/**
 * Experiment: author-location enrichment feasibility on 10 random authors.
 * Old church/place names → Gemini (modern name + oblast + confidence) →
 * geocode via Nominatim AND Photon (both free/OSM) for comparison.
 */
import { GoogleGenAI } from '@google/genai';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: (process.env.AI_LEGACY_DATABASE_URL ?? process.env.DATABASE_URL ?? '').replace(/\?schema=[^&]*(&|$)/, ''),
  max: 2,
});

const ai = new GoogleGenAI({
  vertexai: true,
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? 'global',
});

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
          oblast: { type: 'string', description: 'сучасна область України (або країна, якщо не Україна)' },
          raion: { anyOf: [{ type: 'string' }, { type: 'null' }], description: 'сучасний район (після реформи 2020), null якщо невідомо' },
          confidence: { type: 'integer', description: '0-100, впевненість в ідентифікації' },
          note: { type: 'string', description: 'коротке пояснення (перейменування, зникле село тощо)' },
        },
      },
    },
  },
};

const SYSTEM = `Ти — експерт з історичної географії України. На вхід — церква/установа з історичною локалізацією (назви часів Російської імперії / міжвоєнні: повіти, волості, губернії) та, якщо є, назва населеного пункту з друкованого каталогу 2000-х років.

Для кожного рядка визнач СУЧАСНИЙ населений пункт:
- сучасна українська назва (село могло бути перейменоване, приєднане до міста, затоплене водосховищем чи зникле — поясни в note);
- сучасна область; сучасний район (після реформи 2020 р.);
- confidence 0-100: 90+ тільки коли населений пункт однозначно ідентифікується; якщо назва поширена і повіт не дозволяє розрізнити — знижуй і поясни.
Не вигадуй: якщо ідентифікувати неможливо, confidence < 30 і поясни чому.`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface GeoHit { lat: string; lon: string; label: string }

const nominatim = async (q: string): Promise<GeoHit | null> => {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=uk&countrycodes=ua&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'duckarchive-inspector/1.0 (geo enrichment experiment)' } });
  if (!res.ok) return null;
  const arr = (await res.json()) as { lat: string; lon: string; display_name: string }[];
  return arr[0] ? { lat: arr[0].lat, lon: arr[0].lon, label: arr[0].display_name } : null;
};

const photon = async (q: string): Promise<GeoHit | null> => {
  const url = `https://photon.komoot.io/api/?limit=1&lang=default&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'duckarchive-inspector/1.0' } });
  if (!res.ok) return null;
  const json = (await res.json()) as { features: { geometry: { coordinates: [number, number] }; properties: Record<string, string> }[] };
  const f = json.features?.[0];
  if (!f) return null;
  const p = f.properties;
  return { lat: String(f.geometry.coordinates[1]), lon: String(f.geometry.coordinates[0]), label: [p.name, p.district, p.state].filter(Boolean).join(', ') };
};

const main = async (): Promise<void> => {
  const { rows: authors } = await pool.query<{ id: string; title: string; place: string | null; state: string | null }>(
    `SELECT a.id, a.title,
            (SELECT mode() WITHIN GROUP (ORDER BY m.place) FROM mig_acmb m WHERE m.church_name = a.title AND m.place <> '–') AS place,
            (SELECT mode() WITHIN GROUP (ORDER BY m.state) FROM mig_acmb m WHERE m.church_name = a.title) AS state
     FROM authors a
     WHERE a.lat IS NULL AND EXISTS (SELECT 1 FROM mig_acmb m WHERE m.church_name = a.title)
     ORDER BY random() LIMIT 10`,
  );

  const user = `Установи з історичною локалізацією:\n${JSON.stringify(
    authors.map((a) => ({ id: a.id, назва: a.title, нп_з_каталогу_2000х: a.place, губернія: a.state })),
    null,
    1,
  )}`;

  console.log('── Gemini identification ──');
  const res = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: user,
    config: { systemInstruction: SYSTEM, responseMimeType: 'application/json', responseJsonSchema: SCHEMA, maxOutputTokens: 16384 },
  });
  const parsed = JSON.parse(res.text ?? '{}') as { rows: { id: string; modern_name: string; oblast: string; raion: string | null; confidence: number; note: string }[] };
  const usage = res.usageMetadata;
  console.log(`  tokens: in ${usage?.promptTokenCount}, out ${(usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0)}`);

  for (const a of authors) {
    const g = parsed.rows.find((r) => r.id === a.id);
    console.log('\n════════════════════════════════════════════');
    console.log(`AUTHOR: ${a.title}`);
    console.log(`  acmb:  place="${a.place ?? '—'}" state="${a.state ?? '—'}"`);
    if (!g) { console.log('  AI: NO ROW RETURNED'); continue; }
    console.log(`  AI:    ${g.modern_name}, ${g.raion ?? '?'} р-н, ${g.oblast} [confidence ${g.confidence}] — ${g.note}`);
    const q = `${g.modern_name}, ${g.raion ? g.raion + ' район, ' : ''}${g.oblast}`;
    await sleep(1100); // Nominatim usage policy: max 1 req/s
    const [n, p] = [await nominatim(q), await photon(q)];
    console.log(`  nominatim: ${n ? `${n.lat},${n.lon} — ${n.label}` : 'NOT FOUND'}`);
    console.log(`  photon:    ${p ? `${p.lat},${p.lon} — ${p.label}` : 'NOT FOUND'}`);
  }

  await pool.end();
};

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
