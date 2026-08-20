import { tmpdir } from 'node:os'
import { join } from 'node:path'

/** userData：LANPM_USER_DATA → Electron → 测试回退 tmp */
export function resolveP2pAuthDir(): string {
  if (process.env.LANPM_USER_DATA) return process.env.LANPM_USER_DATA
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { app } = require('electron') as typeof import('electron')
    return app.getPath('userData')
  } catch {
    return join(tmpdir(), 'lanpm-p2p-auth')
  }
}
