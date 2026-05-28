import { app } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'

/** Dev / packaged path to `resources/icon.png` for BrowserWindow & notifications */
export function resolveAppIconPath(): string | undefined {
  const candidates = app.isPackaged
    ? [
        join(process.resourcesPath, 'icon.png'),
        join(process.resourcesPath, 'resources', 'icon.png')
      ]
    : [join(app.getAppPath(), 'resources', 'icon.png')]
  return candidates.find((p) => existsSync(p))
}
