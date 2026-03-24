import { promises as fs } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// Detect runtime: Use Netlify Blobs when deployed, file-based DB locally
// ---------------------------------------------------------------------------
const IS_NETLIFY = !!(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);

// ---------------------------------------------------------------------------
// File-based storage (local development fallback)
// ---------------------------------------------------------------------------
const DB_DIR = path.join(process.cwd(), '.data');

async function ensureDir() {
  try {
    await fs.mkdir(DB_DIR, { recursive: true });
  } catch {}
}

async function readTableFile<T>(table: string): Promise<T[]> {
  await ensureDir();
  const filePath = path.join(DB_DIR, `${table}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeTableFile<T>(table: string, data: T[]): Promise<void> {
  await ensureDir();
  const filePath = path.join(DB_DIR, `${table}.json`);
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Netlify Blobs storage (production)
// ---------------------------------------------------------------------------
async function getTableStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'app-database', consistency: 'strong' });
}

async function readTableBlob<T>(table: string): Promise<T[]> {
  try {
    const store = await getTableStore();
    const data = await store.get(table, { type: 'json' });
    return data ?? [];
  } catch {
    return [];
  }
}

async function writeTableBlob<T>(table: string, data: T[]): Promise<void> {
  const store = await getTableStore();
  await store.setJSON(table, data);
}

// ---------------------------------------------------------------------------
// Unified read/write that picks the right backend
// ---------------------------------------------------------------------------
async function readTable<T>(table: string): Promise<T[]> {
  if (IS_NETLIFY) return readTableBlob<T>(table);
  return readTableFile<T>(table);
}

async function writeTable<T>(table: string, data: T[]): Promise<void> {
  if (IS_NETLIFY) return writeTableBlob<T>(table, data);
  return writeTableFile<T>(table, data);
}

// ---------------------------------------------------------------------------
// Public API (unchanged interface)
// ---------------------------------------------------------------------------
export async function query<T>(table: string): Promise<T[]> {
  return readTable<T>(table);
}

export async function queryWhere<T>(
  table: string,
  predicate: (item: T) => boolean
): Promise<T[]> {
  const data = await readTable<T>(table);
  return data.filter(predicate);
}

export async function findOne<T>(
  table: string,
  predicate: (item: T) => boolean
): Promise<T | null> {
  const data = await readTable<T>(table);
  return data.find(predicate) || null;
}

export async function insert<T>(table: string, item: T): Promise<T> {
  const data = await readTable<T>(table);
  data.push(item);
  await writeTable(table, data);
  return item;
}

export async function update<T>(
  table: string,
  predicate: (item: T) => boolean,
  updates: Partial<T>
): Promise<T | null> {
  const data = await readTable<T>(table);
  const index = data.findIndex(predicate);
  if (index === -1) return null;
  data[index] = { ...data[index], ...updates };
  await writeTable(table, data);
  return data[index];
}

export async function upsert<T>(
  table: string,
  predicate: (item: T) => boolean,
  item: T
): Promise<T> {
  const data = await readTable<T>(table);
  const index = data.findIndex(predicate);
  if (index === -1) {
    data.push(item);
  } else {
    data[index] = item;
  }
  await writeTable(table, data);
  return item;
}

export async function remove<T>(
  table: string,
  predicate: (item: T) => boolean
): Promise<boolean> {
  const data = await readTable<T>(table);
  const filtered = data.filter((item) => !predicate(item));
  if (filtered.length === data.length) return false;
  await writeTable(table, filtered);
  return true;
}
