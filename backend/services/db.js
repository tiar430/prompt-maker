import fs from 'fs';
import path from 'path';
import initSqlJs from 'sql.js';

const DB_FILE = process.env.DB_FILE || path.join(process.cwd(), 'data', 'promptmaker.sqlite');
let _db;
let _SQL;

const ensureDir = (filePath) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

const exec = (db, sql) => {
  db.exec(sql);
};

export const getDb = async () => {
  if (_db) return _db;

  _SQL = await initSqlJs({
    // sql.js will locate wasm from node_modules by default in node env
  });

  ensureDir(DB_FILE);

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    _db = new _SQL.Database(fileBuffer);
  } else {
    _db = new _SQL.Database();
  }

  // Pragmas
  exec(
    _db,
    `PRAGMA journal_mode=MEMORY;
     PRAGMA synchronous=OFF;`
  );

  // Schema
  exec(
    _db,
    `CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        tags TEXT,
        prompt TEXT NOT NULL,
        is_public INTEGER NOT NULL DEFAULT 0,
        rating REAL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_ratings (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL,
        rating INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS prompt_history (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        model TEXT NOT NULL,
        user_input TEXT NOT NULL,
        generated_prompt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        generation_ms INTEGER,
        success INTEGER
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        id TEXT PRIMARY KEY,
        source_type TEXT NOT NULL, -- template|history
        source_id TEXT NOT NULL,
        provider TEXT NOT NULL, -- openrouter|ollama|...
        model TEXT,
        dims INTEGER,
        vector_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
      CREATE INDEX IF NOT EXISTS idx_prompt_history_provider ON prompt_history(provider);
      CREATE INDEX IF NOT EXISTS idx_prompt_history_created_at ON prompt_history(created_at);
      CREATE INDEX IF NOT EXISTS idx_embeddings_source ON embeddings(source_type, source_id);
    `
  );

  await saveDb();
  return _db;
};

export const saveDb = async () => {
  if (!_db) return;
  ensureDir(DB_FILE);
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
};

export const uuid = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const dbAll = async (sql, params = []) => {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
};

export const dbGet = async (sql, params = []) => {
  const rows = await dbAll(sql, params);
  return rows[0] || null;
};

export const dbRun = async (sql, params = []) => {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.run(params);
  stmt.free();
  await saveDb();
};
