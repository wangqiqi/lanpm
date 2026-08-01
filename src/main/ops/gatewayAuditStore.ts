import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

export type GatewayAuditKind = 'terminal_open' | 'terminal_close' | 'file_list' | 'file_read' | 'file_write'

export type GatewayAuditEntry = {
  id: string
  kind: GatewayAuditKind
  at: string
  detail?: string
  remoteAddress?: string
}

type StoreFile = {
  entries: GatewayAuditEntry[]
}

const MAX_ENTRIES = 200

function storePath(): string {
  return join(app.getPath('userData'), 'ops-gateway-audit.json')
}

function readStore(): StoreFile {
  const path = storePath()
  if (!existsSync(path)) return { entries: [] }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as StoreFile
    return { entries: Array.isArray(raw.entries) ? raw.entries : [] }
  } catch {
    return { entries: [] }
  }
}

function writeStore(data: StoreFile): void {
  const path = storePath()
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

export function appendGatewayAudit(
  kind: GatewayAuditKind,
  detail?: string,
  remoteAddress?: string
): void {
  const store = readStore()
  store.entries.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    at: new Date().toISOString(),
    detail,
    remoteAddress
  })
  if (store.entries.length > MAX_ENTRIES) {
    store.entries = store.entries.slice(0, MAX_ENTRIES)
  }
  writeStore(store)
}

export function listGatewayAuditEntries(limit = 50): GatewayAuditEntry[] {
  return readStore().entries.slice(0, limit)
}
