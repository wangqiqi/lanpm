import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'
import {
  DEFAULT_OPS_GROUP_SETTINGS,
  type OpsGroupSettings,
  type OpsGroupSettingsPatch
} from '../../shared/ops/groupSettings.ts'

type StoreFile = {
  groups: OpsGroupSettings[]
}

function storePath(): string {
  return join(app.getPath('userData'), 'ops-group-settings.json')
}

function readStore(): StoreFile {
  const path = storePath()
  if (!existsSync(path)) return { groups: [] }
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as StoreFile
    return { groups: Array.isArray(raw.groups) ? raw.groups : [] }
  } catch {
    return { groups: [] }
  }
}

function writeStore(data: StoreFile): void {
  const path = storePath()
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8')
}

export function getOpsGroupSettings(groupId: string): OpsGroupSettings {
  const found = readStore().groups.find((g) => g.groupId === groupId)
  return found ?? DEFAULT_OPS_GROUP_SETTINGS(groupId)
}

export function patchOpsGroupSettings(
  groupId: string,
  patch: OpsGroupSettingsPatch
): OpsGroupSettings {
  const store = readStore()
  const idx = store.groups.findIndex((g) => g.groupId === groupId)
  const current = idx >= 0 ? store.groups[idx]! : DEFAULT_OPS_GROUP_SETTINGS(groupId)
  const next: OpsGroupSettings = {
    groupId,
    assistantEnabled: patch.assistantEnabled ?? current.assistantEnabled,
    watchEnabled: patch.watchEnabled ?? current.watchEnabled
  }
  if (idx >= 0) store.groups[idx] = next
  else store.groups.push(next)
  writeStore(store)
  return next
}

export function listWatchEnabledGroupIds(): string[] {
  return readStore().groups.filter((g) => g.watchEnabled).map((g) => g.groupId)
}
