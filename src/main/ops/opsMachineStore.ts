import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import type { OpsMachineRecord } from '../../shared/ops/types.ts'
import { DEFAULT_GATEWAY_PATHS, type GatewayPaths } from '../../shared/ops/paths.ts'

type StoreFile = {
  machines: OpsMachineRecord[]
}

function storePath(): string {
  return join(app.getPath('userData'), 'ops-machines.json')
}

function readStore(): StoreFile {
  const path = storePath()
  if (!existsSync(path)) return { machines: [] }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as StoreFile
    return { machines: Array.isArray(raw.machines) ? raw.machines : [] }
  } catch {
    return { machines: [] }
  }
}

function writeStore(data: StoreFile): void {
  const path = storePath()
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

export function listOpsMachines(groupId?: string): OpsMachineRecord[] {
  const machines = readStore().machines
  if (!groupId) return machines
  return machines.filter((m) => m.groupIds.includes(groupId))
}

export function getOpsMachine(deviceId: string): OpsMachineRecord | null {
  return readStore().machines.find((m) => m.deviceId === deviceId) ?? null
}

export function upsertOpsMachine(record: OpsMachineRecord): OpsMachineRecord {
  const store = readStore()
  const idx = store.machines.findIndex((m) => m.deviceId === record.deviceId)
  if (idx >= 0) store.machines[idx] = record
  else store.machines.push(record)
  writeStore(store)
  return record
}

export function setOpsMachineOnline(deviceId: string, online: boolean): OpsMachineRecord | null {
  const store = readStore()
  const idx = store.machines.findIndex((m) => m.deviceId === deviceId)
  if (idx < 0) return null
  store.machines[idx] = { ...store.machines[idx]!, online }
  writeStore(store)
  return store.machines[idx]!
}

export function machineUserId(deviceId: string): string {
  return `machine:${deviceId}`
}

export function gatewayPathsFromMachine(machine: OpsMachineRecord): GatewayPaths {
  return {
    root: machine.root,
    inboundDir: machine.inboundDir,
    outboundPaths: machine.outboundPaths,
    maxBytes: DEFAULT_GATEWAY_PATHS.maxBytes
  }
}

export function createOpsMachineRecord(args: {
  deviceId: string
  displayName: string
  groupIds: string[]
  root?: string
}): OpsMachineRecord {
  return {
    deviceId: args.deviceId,
    displayName: args.displayName,
    groupIds: args.groupIds,
    online: true,
    root: args.root ?? DEFAULT_GATEWAY_PATHS.root,
    inboundDir: DEFAULT_GATEWAY_PATHS.inboundDir,
    outboundPaths: { ...DEFAULT_GATEWAY_PATHS.outboundPaths }
  }
}
