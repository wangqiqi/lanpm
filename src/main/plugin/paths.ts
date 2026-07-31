import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { SIDELOAD_PLUGINS_DIR } from '../../shared/plugin/sideloadFormat.ts'

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

/** 用户侧载插件根：`userData/sideload-plugins/` */
export function resolveSideloadPluginsRoot(): string {
  const root = join(app.getPath('userData'), SIDELOAD_PLUGINS_DIR)
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true })
  }
  return root
}
