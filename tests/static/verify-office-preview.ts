/**
 * TASK-5801+ — Office light preview (mammoth/exceljs when soffice missing).
 * Run: npm run verify:office-preview
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
}

assert.ok(pkg.scripts?.['verify:office-preview'], 'missing verify:office-preview script')
assert.ok(pkg.dependencies?.mammoth, 'mammoth must be a dependency')
assert.ok(pkg.dependencies?.exceljs, 'exceljs must be a dependency')

const previewService = readFileSync(join(root, 'src/main/file/previewService.ts'), 'utf8')
assert.match(previewService, /soffice/)
assert.match(previewService, /isOfficeLightExtension/)
assert.match(previewService, /convertOfficeLightHtml/)

const convert = readFileSync(join(root, 'src/main/file/officeLightConvert.ts'), 'utf8')
assert.match(convert, /mammoth/)
assert.match(convert, /exceljs/)
assert.match(convert, /preview\.html/)

const helper = readFileSync(join(root, 'src/shared/file/officeLightPreview.ts'), 'utf8')
assert.match(helper, /shouldUseOfficeLightPreview/)
assert.match(helper, /sanitizeOfficeHtmlFragment/)

const filesView = readFileSync(join(root, 'src/renderer/src/features/files/FilesView.tsx'), 'utf8')
assert.match(filesView, /shouldUsePdfJsPreview/)
assert.match(filesView, /shouldUseOfficeLightPreview/)
assert.match(filesView, /OfficeLightPreview/)

const lightUi = readFileSync(
  join(root, 'src/renderer/src/features/files/OfficeLightPreview.tsx'),
  'utf8'
)
assert.match(lightUi, /sandbox=""/)
assert.match(lightUi, /office-light-preview/)

const html = readFileSync(join(root, 'src/renderer/index.html'), 'utf8')
assert.match(html, /frame-src[^"]*lanpm-preview:/)

const stub = readFileSync(join(root, 'src/renderer/src/platform/browserLanpmStub.ts'), 'utf8')
assert.match(stub, /Office light preview/)
assert.match(stub, /getPreviewUrl/)

const docs06 = readFileSync(join(root, 'docs/06_ROADMAP.md'), 'utf8')
assert.match(docs06, /verify:office-preview/)
assert.match(docs06, /mammoth \/ exceljs/)

console.log('verify:office-preview OK')
