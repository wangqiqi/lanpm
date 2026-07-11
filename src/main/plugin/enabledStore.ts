import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'

type EnabledMap = Record<string, boolean>

function enabledPath(): string {
  return join(app.getPath('userData'), 'plugin-enabled.json')
}

export function readEnabledMap(): EnabledMap {
  const path = enabledPath()
  if (!existsSync(path)) return {}
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (!raw || typeof raw !== 'object') return {}
    const out: EnabledMap = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'boolean') out[k] = v
    }
    return out
  } catch {
    return {}
  }
}

export function writeEnabledMap(map: EnabledMap): void {
  const path = enabledPath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(map, null, 2), 'utf8')
}

/** 未写入过启用态时默认启用 */
export function isPluginEnabled(pluginId: string, map: EnabledMap): boolean {
  if (Object.prototype.hasOwnProperty.call(map, pluginId)) {
    return map[pluginId] === true
  }
  return true
}

export function setPluginEnabled(pluginId: string, enabled: boolean): EnabledMap {
  const map = readEnabledMap()
  map[pluginId] = enabled
  writeEnabledMap(map)
  return map
}
