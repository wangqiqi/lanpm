import { net, protocol } from 'electron'
import { existsSync } from 'fs'
import { pathToFileURL } from 'node:url'
import type { Database } from 'better-sqlite3'
import { getFileById } from '../storage/repositories/fileRepository'

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
  if (!meta || meta.isBookmark) return null
  if (meta.previewStatus === 'ready' && meta.previewPath && existsSync(meta.previewPath)) {
    return meta.previewPath
  }
  if (existsSync(meta.storagePath)) return meta.storagePath
  return null
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
