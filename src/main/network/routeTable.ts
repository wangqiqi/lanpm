import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import {
  parseLinuxIpRoute,
  parseMacOsNetstatRn,
  parseWindowsRoutePrint
} from '../../shared/network/routeTableParse.ts'

const execFileAsync = promisify(execFile)

/** 读取本机 IPv4 路由表，返回 /24 子网前缀列表（失败返回 `[]`） */
export async function listRouteSubnetPrefixes(): Promise<string[]> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('route', ['print', '-4'], {
        windowsHide: true,
        timeout: 5_000,
        maxBuffer: 2 * 1024 * 1024
      })
      return parseWindowsRoutePrint(stdout)
    }

    if (process.platform === 'linux') {
      const { stdout } = await execFileAsync('ip', ['-4', 'route'], {
        timeout: 5_000,
        maxBuffer: 2 * 1024 * 1024
      })
      return parseLinuxIpRoute(stdout)
    }

    if (process.platform === 'darwin') {
      const { stdout } = await execFileAsync('netstat', ['-rn', '-f', 'inet'], {
        timeout: 5_000,
        maxBuffer: 2 * 1024 * 1024
      })
      return parseMacOsNetstatRn(stdout)
    }

    return []
  } catch {
    return []
  }
}
