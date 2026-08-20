/**
 * TASK-4001+ — PDF preview (pdfjs-dist) guards.
 * Run: npm run verify:pdf-preview
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

assert.ok(pkg.scripts?.['verify:pdf-preview'], 'missing verify:pdf-preview script')
assert.match(pkg.scripts?.predev ?? '', /ensure-pdfjs-assets/)
assert.match(pkg.scripts?.prebuild ?? '', /ensure-pdfjs-assets/)
assert.ok(
  pkg.dependencies?.['pdfjs-dist'] || pkg.devDependencies?.['pdfjs-dist'],
  'pdfjs-dist must be a package dependency'
)

const ensure = readFileSync(join(root, 'scripts/ensure-pdfjs-assets.mjs'), 'utf8')
assert.match(ensure, /pdf\.worker\.min\.mjs/)
assert.match(ensure, /src\/renderer\/public\/pdfjs/)

const html = readFileSync(join(root, 'src/renderer/index.html'), 'utf8')
assert.match(html, /worker-src 'self'/)

execFileSync(process.execPath, [join(root, 'scripts/ensure-pdfjs-assets.mjs')], {
  cwd: root,
  stdio: 'pipe'
})
assert.ok(
  existsSync(join(root, 'src/renderer/public/pdfjs/pdf.worker.min.mjs')),
  'pdfjs worker must be copied to renderer public'
)

const gitignore = readFileSync(join(root, '.gitignore'), 'utf8')
assert.match(gitignore, /src\/renderer\/public\/pdfjs\//)

const filesView = readFileSync(
  join(root, 'src/renderer/src/features/files/FilesView.tsx'),
  'utf8'
)
assert.match(filesView, /PdfPreview/)
assert.match(filesView, /shouldUsePdfJsPreview/)
assert.doesNotMatch(filesView, /<iframe/, 'FilesView must not use iframe for PDF preview')

const preview = readFileSync(
  join(root, 'src/renderer/src/features/files/PdfPreview.tsx'),
  'utf8'
)
assert.match(preview, /getDocument/)
assert.match(preview, /PDFJS_WORKER_PUBLIC_PATH/)
assert.match(preview, /from 'pdfjs-dist'/)

const helper = readFileSync(join(root, 'src/shared/file/pdfPreview.ts'), 'utf8')
assert.match(helper, /PDFJS_WORKER_PUBLIC_PATH/)
assert.match(helper, /shouldUsePdfJsPreview/)

console.log('verify-pdf-preview: assets+csp+viewer OK')
