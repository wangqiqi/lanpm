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

console.log('verify-pdf-preview: assets+csp OK')
