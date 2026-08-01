import { execFile } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import type { GatewayPaths } from '../../shared/ops/paths.ts'
import { PathForbiddenError } from '../gateway/pathGuard.ts'
import { readGatewayFile } from '../gateway/fileStore.ts'
import { formatBytes, readDiskUsageSync } from './statusSnapshot.ts'

const execFileAsync = promisify(execFile)

export const TAIL_MAX_LINES = 100

/** Resolve `/tail` target under outbound keys, outbound log dirs, or inboundDir only. */
export function resolveTailRel(paths: GatewayPaths, arg: string): string {
  const raw = arg.trim()
  if (!raw) throw new PathForbiddenError('TAIL_PATH_REQUIRED')

  const outboundRel = paths.outboundPaths[raw]
  if (outboundRel) return outboundRel

  const rel = raw.replace(/^\/+/, '')
  const inbound = paths.inboundDir.replace(/\/$/, '')

  if (rel === inbound || rel.startsWith(`${inbound}/`)) return rel

  if (Object.values(paths.outboundPaths).includes(rel)) return rel

  const outboundDirs = new Set(
    Object.values(paths.outboundPaths).map((p) => {
      const dir = path.posix.dirname(p.replace(/\\/g, '/'))
      return dir === '.' ? '' : dir
    })
  )

  for (const dir of outboundDirs) {
    if (!dir) continue
    if (rel === dir || rel.startsWith(`${dir}/`)) return rel
  }

  throw new PathForbiddenError('TAIL_PATH_NOT_ALLOWED')
}

export function formatDiskSnapshot(paths: GatewayPaths): string {
  const disk = readDiskUsageSync(paths.root)
  if (!disk) return 'disk: unavailable'
  return `disk(${paths.root}): ${disk.usedPct}% (${formatBytes(disk.usedBytes)} / ${formatBytes(disk.totalBytes)})`
}

export async function formatPsSnapshot(): Promise<string> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('tasklist', [], {
        timeout: 5000,
        maxBuffer: 64 * 1024
      })
      return stdout.trim().split('\n').slice(0, 25).join('\n')
    }
    const { stdout } = await execFileAsync('ps', ['aux'], {
      timeout: 5000,
      maxBuffer: 256 * 1024
    })
    return stdout.trim().split('\n').slice(0, 25).join('\n')
  } catch {
    return 'ps: unavailable'
  }
}

export async function tailGatewayText(
  paths: GatewayPaths,
  rel: string,
  maxLines = TAIL_MAX_LINES
): Promise<string> {
  const data = await readGatewayFile(paths, rel)
  const text = data.toString('utf8')
  const lines = text.split(/\r?\n/)
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
  const tail = lines.slice(-maxLines)
  const omitted = lines.length - tail.length
  const body = tail.join('\n')
  if (omitted > 0) {
    return `… ${omitted} earlier lines omitted …\n${body}`
  }
  return body
}
