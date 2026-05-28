import type { Database } from 'better-sqlite3'

export function getMeta(db: Database, key: string): string | null {
  const row = db.prepare('SELECT value FROM sync_meta WHERE key = ?').get(key) as
    | { value: string }
    | undefined
  return row?.value ?? null
}

export function setMeta(db: Database, key: string, value: string): void {
  db.prepare(
    `INSERT INTO sync_meta (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value)
}

export function deleteMeta(db: Database, key: string): void {
  db.prepare('DELETE FROM sync_meta WHERE key = ?').run(key)
}
