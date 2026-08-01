import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { OpsAuditEntry, OpsWatchAuditEntry } from '../../shared/ops/auditTypes.ts'

const MAX_ENTRIES = 500
const MAX_WATCH_ENTRIES = 200

type StoreFile = {
  entries: OpsAuditEntry[]
  watchEntries?: OpsWatchAuditEntry[]
}

function storePath(): string {
  return join(app.getPath('userData'), 'ops-command-audit.json')
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

export function appendOpsAuditEntry(entry: OpsAuditEntry): void {
  const store = readStore()
  store.entries.unshift(entry)
  if (store.entries.length > MAX_ENTRIES) {
    store.entries = store.entries.slice(0, MAX_ENTRIES)
  }
  writeStore(store)
}

export function completeOpsAuditEntry(
  requestId: string,
  patch: Pick<OpsAuditEntry, 'status' | 'resultSummary' | 'completedAt'>
): void {
  const store = readStore()
  const idx = store.entries.findIndex((e) => e.requestId === requestId)
  if (idx < 0) return
  store.entries[idx] = { ...store.entries[idx]!, ...patch }
  writeStore(store)
}

export function listOpsAuditEntries(groupId?: string, limit = 50): OpsAuditEntry[] {
  const entries = readStore().entries
  const filtered = groupId ? entries.filter((e) => e.groupId === groupId) : entries
  return filtered.slice(0, limit)
}

export function appendOpsWatchAudit(input: {
  groupId: string
  machineDisplayName: string
  filePath: string
}): void {
  const store = readStore()
  const watchEntries = Array.isArray(store.watchEntries) ? store.watchEntries : []
  watchEntries.unshift({
    id: `watch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    groupId: input.groupId,
    machineDisplayName: input.machineDisplayName,
    filePath: input.filePath,
    pushedAt: new Date().toISOString()
  })
  store.watchEntries = watchEntries.slice(0, MAX_WATCH_ENTRIES)
  writeStore(store)
}

export function listOpsWatchAuditEntries(groupId?: string, limit = 50): OpsWatchAuditEntry[] {
  const watchEntries = readStore().watchEntries ?? []
  const filtered = groupId ? watchEntries.filter((e) => e.groupId === groupId) : watchEntries
  return filtered.slice(0, limit)
}
