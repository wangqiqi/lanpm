#!/usr/bin/env node
/** Copy pdfjs worker for CSP worker-src 'self' (no CDN). */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const src = join(root, 'node_modules/pdfjs-dist/build/pdf.worker.min.mjs')
const destDir = join(root, 'src/renderer/public/pdfjs')
const dest = join(destDir, 'pdf.worker.min.mjs')

if (!existsSync(src)) {
  console.warn('[lanpm] skip pdfjs worker — pdfjs-dist not installed')
  process.exit(0)
}

mkdirSync(destDir, { recursive: true })
copyFileSync(src, dest)
console.info('[lanpm] pdfjs worker → src/renderer/public/pdfjs/pdf.worker.min.mjs')
