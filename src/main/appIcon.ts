import { app, nativeImage, type NativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

function resourcesDir(): string {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
}

/** Dev / packaged path to icon file for BrowserWindow & notifications */
export function resolveAppIconPath(): string | undefined {
  const dir = resourcesDir()
  const candidates =
    process.platform === 'win32'
      ? [join(dir, 'icon.ico'), join(dir, 'icon.png')]
      : [join(dir, 'icon.png'), join(dir, 'icon.ico')]
  if (app.isPackaged) {
    candidates.push(join(process.resourcesPath, 'resources', 'icon.png'))
  }
  return candidates.find((p) => existsSync(p))
}

/** Windows 任务栏优先 .ico；打包与 dev 共用 */
export function resolveWindowIcon(): NativeImage | undefined {
  const path = resolveAppIconPath()
  if (!path) return undefined
  const image = nativeImage.createFromPath(path)
  return image.isEmpty() ? undefined : image
}
