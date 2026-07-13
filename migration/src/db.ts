import { Pool, PoolClient } from 'pg';

// Deliberately NOT reading DATABASE_URL from .env — migration must never
// accidentally run against prod. Override only via MIGRATION_DATABASE_URL.
// default: local unix socket (peer auth), same as plain `psql -d inspector_local`
const connectionString =
  process.env.MIGRATION_DATABASE_URL || 'postgres:///inspector_local?host=/var/run/postgresql';

export const pool = new Pool({ connectionString, max: 4 });

export const withClient = async <T>(fn: (client: PoolClient) => Promise<T>): Promise<T> => {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
};

/** Chunked multi-row INSERT. `cols` are column names; each row is an array of values in the same order. */
export const insertMany = async (
  client: PoolClient,
  table: string,
  cols: string[],
  rows: unknown[][],
  onConflict = 'ON CONFLICT DO NOTHING',
): Promise<number> => {
  if (!rows.length) return 0;
  const chunkSize = Math.max(1, Math.floor(60000 / cols.length));
  let inserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const params: unknown[] = [];
    const values = chunk
      .map((row) => `(${row.map((v) => (params.push(v), `$${params.length}`)).join(',')})`)
      .join(',');
    const res = await client.query(
      `INSERT INTO ${table} (${cols.join(',')}) VALUES ${values} ${onConflict}`,
      params,
    );
    inserted += res.rowCount ?? 0;
  }
  return inserted;
};
