// Storage. Postgres when DATABASE_URL is set (production), Node's built-in SQLite otherwise.
// Queries use $1..$n placeholders, always in order.

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    mcp_key TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    data TEXT NOT NULL,
    share_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS activity (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    kind TEXT NOT NULL,
    text TEXT NOT NULL,
    at BIGINT NOT NULL
  )`,
  'CREATE INDEX IF NOT EXISTS plans_user ON plans (user_id)',
  'CREATE INDEX IF NOT EXISTS activity_plan ON activity (plan_id)',
];

let impl;

export async function initDb() {
  if (process.env.DATABASE_URL) {
    const pg = (await import('pg')).default;
    pg.types.setTypeParser(20, (v) => Number(v)); // BIGINT as number
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      // Render's internal hostnames (no dots) don't use SSL; external URLs do.
      ssl: process.env.PGSSL === 'disable' || !/@[^/]*\./.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false },
      max: 5,
    });
    impl = {
      kind: 'postgres',
      all: async (sql, params = []) => (await pool.query(sql, params)).rows,
      run: async (sql, params = []) => { await pool.query(sql, params); },
    };
  } else {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(process.env.SQLITE_PATH || 'loanlens.db');
    const conv = (sql) => sql.replace(/\$\d+/g, '?');
    impl = {
      kind: 'sqlite',
      all: async (sql, params = []) => db.prepare(conv(sql)).all(...params),
      run: async (sql, params = []) => { db.prepare(conv(sql)).run(...params); },
    };
  }
  for (const s of SCHEMA) await impl.run(s);
  return impl.kind;
}

export const all = (sql, params) => impl.all(sql, params);
export const one = async (sql, params) => (await impl.all(sql, params))[0] || null;
export const run = (sql, params) => impl.run(sql, params);
