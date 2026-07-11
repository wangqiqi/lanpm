import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

/** 内置插件根目录：开发 = 仓库 plugins/；打包 = resources/plugins */
export function resolvePluginsRoot(): string {
  if (app.isPackaged) {
    const packed = join(process.resourcesPath, 'plugins')
    if (existsSync(packed)) return packed
  }
  const candidates = [
    join(app.getAppPath(), 'plugins'),
    join(process.cwd(), 'plugins')
  ]
  return candidates.find((p) => existsSync(p)) ?? candidates[0]!
}
