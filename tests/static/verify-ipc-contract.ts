/**
 * AUTO-01 — preload invoke/sendSync 通道 ⊆ main ipc 注册；与 shared channels 对齐。
 * Run: npm run verify:ipc-contract
 */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { projectRoot } from '../projectRoot.ts'
import { CHAT_IPC } from '../../src/shared/chat/channels.ts'
import { FILE_IPC } from '../../src/shared/file/channels.ts'
import { TASK_IPC } from '../../src/shared/task/channels.ts'
import { GROUP_IPC } from '../../src/shared/group/channels.ts'
import { COCKPIT_IPC } from '../../src/shared/cockpit/channels.ts'
import { SEARCH_IPC } from '../../src/shared/search/channels.ts'
import { NETWORK_IPC } from '../../src/shared/network/status.ts'
import { BADGE_IPC } from '../../src/shared/badge/types.ts'

const IDENTITY_CHANNELS = {
  getStatus: 'identity:getStatus',
  complete: 'identity:completeSetup',
  updateProfile: 'identity:updateProfile',
  reset: 'identity:resetIdentity',
  getSuggestedDeviceNameSync: 'identity:getSuggestedDeviceNameSync'
} as const

const root = projectRoot

const DECLARED = new Set<string>([
  ...Object.values(CHAT_IPC),
  ...Object.values(FILE_IPC),
  ...Object.values(TASK_IPC),
  ...Object.values(GROUP_IPC),
  ...Object.values(COCKPIT_IPC),
  ...Object.values(SEARCH_IPC),
  ...Object.values(NETWORK_IPC),
  ...Object.values(BADGE_IPC),
  ...Object.values(IDENTITY_CHANNELS)
])

function extractPreloadChannels(src: string): string[] {
  const channels: string[] = []
  for (const m of src.matchAll(/ipcRenderer\.invoke\(\s*['"]([^'"]+)['"]/g)) {
    channels.push(m[1]!)
  }
  for (const m of src.matchAll(/ipcRenderer\.sendSync\(\s*['"]([^'"]+)['"]/g)) {
    channels.push(m[1]!)
  }
  return channels
}

function extractMainHandlers(): Set<string> {
  const handlers = new Set<string>()
  const ipcDir = join(root, 'src/main/ipc')
  const channelMaps: Record<string, Record<string, string>> = {
    CHAT_IPC,
    FILE_IPC,
    TASK_IPC,
    GROUP_IPC,
    COCKPIT_IPC,
    SEARCH_IPC,
    NETWORK_IPC,
    BADGE_IPC,
    IDENTITY_CHANNELS
  }

  for (const file of readdirSync(ipcDir).filter((f) => f.endsWith('.ts'))) {
    const src = readFileSync(join(ipcDir, file), 'utf8')
    for (const m of src.matchAll(/ipcMain\.handle\(\s*['"]([^'"]+)['"]/g)) {
      handlers.add(m[1]!)
    }
    for (const m of src.matchAll(/ipcMain\.handle\(\s*(\w+)\.(\w+)/g)) {
      const mapName = m[1]!
      const key = m[2]!
      const map = channelMaps[mapName]
      const resolved = map?.[key]
      if (resolved) handlers.add(resolved)
    }
    for (const m of src.matchAll(/ipcMain\.on\(\s*(\w+)\.(\w+)/g)) {
      const map = channelMaps[m[1]!]
      const resolved = map?.[m[2]!]
      if (resolved) handlers.add(resolved)
    }
    for (const m of src.matchAll(/ipcMain\.on\(\s*['"]([^'"]+)['"]/g)) {
      handlers.add(m[1]!)
    }
  }
  return handlers
}

const preloadSrc = readFileSync(join(root, 'src/preload/index.ts'), 'utf8')
const preloadChannels = extractPreloadChannels(preloadSrc)
const mainHandlers = extractMainHandlers()

for (const ch of preloadChannels) {
  assert.ok(mainHandlers.has(ch), `preload channel not registered in main: ${ch}`)
  assert.ok(DECLARED.has(ch), `preload channel missing from shared IPC constants: ${ch}`)
}

for (const ch of [...DECLARED].filter((c) => !c.includes('Sync'))) {
  if (ch === IDENTITY_CHANNELS.getSuggestedDeviceNameSync) continue
  assert.ok(mainHandlers.has(ch), `declared IPC not registered in main: ${ch}`)
}

console.log(
  `verify:ipc-contract OK (${preloadChannels.length} preload, ${mainHandlers.size} main, ${DECLARED.size} declared)`
)
