import { app, nativeImage, type NativeImage } from 'electron'
import { existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

/** Compiled main lives in out/main — reliable dev path to repo resources/ */
const mainDir = dirname(fileURLToPath(import.meta.url))

function iconCandidateDirs(): string[] {
  const dirs: string[] = []
  if (app.isPackaged) {
    dirs.push(process.resourcesPath)
    dirs.push(join(process.resourcesPath, 'resources'))
  } else {
    dirs.push(join(mainDir, '../../resources'))
    dirs.push(join(mainDir, '../resources'))
    dirs.push(join(app.getAppPath(), 'resources'))
    dirs.push(join(process.cwd(), 'resources'))
  }
  return [...new Set(dirs)]
}

/** Dev / packaged path to icon file for BrowserWindow, Tray & notifications */
export function resolveAppIconPath(): string | undefined {
  const names =
    process.platform === 'win32'
      ? ['icon.ico', 'icon.png']
      : ['icon.png', 'icon.ico']

  for (const dir of iconCandidateDirs()) {
    for (const name of names) {
      const path = resolve(join(dir, name))
      if (existsSync(path)) return path
    }
  }
  return undefined
}

/** Windows 任务栏优先 .ico；打包与 dev 共用 */
export function resolveWindowIcon(): NativeImage | undefined {
  const path = resolveAppIconPath()
  if (!path) return undefined
  const image = nativeImage.createFromPath(path)
  return image.isEmpty() ? undefined : image
}

/** 系统托盘用小尺寸位图（Windows 通知区 16px） */
export function resolveTrayIcon(): NativeImage | undefined {
  const base = resolveWindowIcon()
  if (!base) return undefined
  const size = process.platform === 'darwin' ? 22 : 16
  const resized = base.resize({ width: size, height: size })
  return resized.isEmpty() ? base : resized
}
