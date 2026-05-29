import { net, protocol } from 'electron'
import { pathToFileURL } from 'node:url'
import type { Database } from 'better-sqlite3'
import { getFileById } from '../storage/repositories/fileRepository'
import { resolvePreviewDiskPath } from './storagePathResolver'

export const LANPM_PREVIEW_SCHEME = 'lanpm-preview'

/** 须在 app.whenReady 之前调用 */
export function registerPreviewScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: LANPM_PREVIEW_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true
      }
    }
  ])
}

function resolveDiskPath(db: Database, fileId: string): string | null {
  const meta = getFileById(db, fileId)
  if (!meta) return null
  return resolvePreviewDiskPath(meta)
}

export function registerPreviewProtocol(getDb: () => Database): void {
  protocol.handle(LANPM_PREVIEW_SCHEME, (request) => {
    const url = new URL(request.url)
    const fileId = decodeURIComponent(url.pathname.replace(/^\//, ''))
    if (!fileId) return new Response('Not found', { status: 404 })

    const diskPath = resolveDiskPath(getDb(), fileId)
    if (!diskPath) return new Response('Not found', { status: 404 })

    return net.fetch(pathToFileURL(diskPath).href)
  })
}

export function previewUrlForFileId(fileId: string): string {
  return `${LANPM_PREVIEW_SCHEME}://file/${encodeURIComponent(fileId)}`
}
