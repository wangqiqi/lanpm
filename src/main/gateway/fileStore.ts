import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { GatewayPaths } from '../../shared/ops/paths.ts'
import { PathForbiddenError, resolveSafePath } from './pathGuard.ts'

export type GatewayDirEntry = {
  name: string
  type: 'file' | 'dir'
  size?: number
}

export type { GatewayPaths }

export async function listGatewayDir(
  paths: GatewayPaths,
  dirRel: string
): Promise<GatewayDirEntry[]> {
  const dirAbs = resolveSafePath(paths.root, dirRel)
  const st = await fs.stat(dirAbs).catch(() => null)
  if (!st?.isDirectory()) {
    throw new Error('NOT_A_DIRECTORY')
  }
  const names = await fs.readdir(dirAbs)
  return Promise.all(
    names.map(async (name) => {
      const full = path.join(dirAbs, name)
      const entryStat = await fs.stat(full)
      return {
        name,
        type: entryStat.isDirectory() ? 'dir' : 'file',
        size: entryStat.isFile() ? entryStat.size : undefined
      }
    })
  )
}

export async function readGatewayFile(paths: GatewayPaths, rel: string): Promise<Buffer> {
  const abs = resolveSafePath(paths.root, rel)
  if (!existsSync(abs)) throw new Error('NOT_FOUND')
  const st = await fs.stat(abs)
  if (!st.isFile()) throw new Error('NOT_A_FILE')
  if (st.size > paths.maxBytes) throw new Error('PAYLOAD_TOO_LARGE')
  return fs.readFile(abs)
}

export async function writeGatewayFile(
  paths: GatewayPaths,
  rel: string,
  data: Buffer
): Promise<void> {
  if (data.length > paths.maxBytes) throw new Error('PAYLOAD_TOO_LARGE')
  const abs = resolveSafePath(paths.root, rel)
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, data)
}

export function resolveOutboundLogRel(paths: GatewayPaths, key: string): string {
  const rel = paths.outboundPaths[key] ?? paths.outboundPaths.app
  if (!rel) throw new PathForbiddenError('OUTBOUND_PATH_UNKNOWN')
  return rel
}
