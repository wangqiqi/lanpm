import type { Database } from 'better-sqlite3'
import chokidar, { type FSWatcher } from 'chokidar'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { getSetupStatus } from '../identity/setup.ts'
import { sendFileMessage } from '../chat/chatService.ts'
import { gatewayPathsFromMachine, getOpsMachine } from './opsMachineStore.ts'
import { listWatchEnabledGroupIds } from './opsGroupSettingsStore.ts'
import { appendOpsWatchAudit } from './auditStore.ts'
import { catchSyncFailure } from '../utils/reportSyncFailure.ts'

const THROTTLE_MS = 30_000
const lastPushAt = new Map<string, number>()
const watchers = new Map<string, FSWatcher>()

function throttleKey(groupId: string, absPath: string): string {
  return `${groupId}:${absPath}`
}

function shouldThrottle(groupId: string, absPath: string): boolean {
  const key = throttleKey(groupId, absPath)
  const now = Date.now()
  const prev = lastPushAt.get(key) ?? 0
  if (now - prev < THROTTLE_MS) return true
  lastPushAt.set(key, now)
  return false
}

async function pushOutboundFile(
  db: Database,
  groupId: string,
  machineDisplayName: string,
  absPath: string
): Promise<void> {
  if (!existsSync(absPath)) return
  if (shouldThrottle(groupId, absPath)) return
  try {
    await sendFileMessage(db, groupId, absPath)
    appendOpsWatchAudit({
      groupId,
      machineDisplayName,
      filePath: absPath
    })
  } catch (err) {
    console.warn('[ops-watch] push failed', absPath, err)
  }
}

function stopAllWatchers(): void {
  for (const w of watchers.values()) {
    void w.close()
  }
  watchers.clear()
}

function startWatcherForPath(
  db: Database,
  groupId: string,
  machineDisplayName: string,
  absPath: string
): void {
  const watchId = `${groupId}:${absPath}`
  if (watchers.has(watchId)) return

  const watcher = chokidar.watch(absPath, {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 }
  })

  const onChange = (): void => {
    void pushOutboundFile(db, groupId, machineDisplayName, absPath).catch(
      catchSyncFailure('ops.watchPush', { notify: false })
    )
  }

  watcher.on('add', onChange)
  watcher.on('change', onChange)
  watchers.set(watchId, watcher)
}

/** 根据群 watch 开关与本机 Agent 重建 chokidar 监听 */
export function refreshOutboundWatchers(db: Database): void {
  stopAllWatchers()
  lastPushAt.clear()

  const status = getSetupStatus(db)
  if (!status.configured || !status.device) return

  const machine = getOpsMachine(status.device.deviceId)
  if (!machine) return

  const paths = gatewayPathsFromMachine(machine)
  const absPaths = Object.values(paths.outboundPaths).map((rel) =>
    resolve(paths.root, rel)
  )

  const enabledGroups = listWatchEnabledGroupIds().filter((gid) =>
    machine.groupIds.includes(gid)
  )
  if (enabledGroups.length === 0) return

  for (const groupId of enabledGroups) {
    for (const absPath of absPaths) {
      if (!existsSync(absPath)) continue
      startWatcherForPath(db, groupId, machine.displayName, absPath)
    }
  }
}

export function shutdownOutboundWatchers(): void {
  stopAllWatchers()
  lastPushAt.clear()
}
