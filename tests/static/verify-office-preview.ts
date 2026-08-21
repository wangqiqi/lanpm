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

console.log('verify:office-preview OK')
