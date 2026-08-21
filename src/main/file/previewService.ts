import { execFile } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { promisify } from 'util'
import { app } from 'electron'
import type { Database } from 'better-sqlite3'
import type { FileMeta, FilePreviewStatus } from '../../shared/file/types'
import { isOfficeLightExtension } from '../../shared/file/officeLightPreview.ts'
import { isDirectPreviewReady } from '../../shared/file/previewExtensions.ts'
import { updateFilePreview } from '../storage/repositories/fileRepository'
import { convertOfficeLightHtml } from './officeLightConvert.ts'

const execFileAsync = promisify(execFile)

const OFFICE_EXT = new Set(['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp'])

function previewRootDir(): string {
  const dir = join(app.getPath('userData'), 'previews')
  mkdirSync(dir, { recursive: true })
  return dir
}

export async function generatePreview(db: Database, meta: FileMeta): Promise<FilePreviewStatus> {
  if (isDirectPreviewReady(meta)) {
    updateFilePreview(db, meta.fileId, 'ready', meta.storagePath)
    return 'ready'
  }

  const ext = meta.ext.toLowerCase()
  if (!OFFICE_EXT.has(ext)) {
    updateFilePreview(db, meta.fileId, 'none')
    return 'none'
  }

  updateFilePreview(db, meta.fileId, 'converting')
  const outDir = join(previewRootDir(), meta.fileId)
  mkdirSync(outDir, { recursive: true })
  const outPdf = join(outDir, `${meta.name.replace(/\.[^.]+$/, '')}.pdf`)

  try {
    await execFileAsync('soffice', [
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      outDir,
      meta.storagePath
    ])
    if (existsSync(outPdf)) {
      updateFilePreview(db, meta.fileId, 'ready', outPdf)
      return 'ready'
    }
  } catch {
    /* LibreOffice 未安装 */
  }

  if (isOfficeLightExtension(ext) && existsSync(meta.storagePath)) {
    try {
      const htmlPath = await convertOfficeLightHtml(meta.storagePath, ext, outDir)
      if (htmlPath && existsSync(htmlPath)) {
        updateFilePreview(db, meta.fileId, 'ready', htmlPath)
        return 'ready'
      }
    } catch {
      /* mammoth / exceljs 解析失败 */
    }
  }

  updateFilePreview(db, meta.fileId, 'failed')
  return 'failed'
}
