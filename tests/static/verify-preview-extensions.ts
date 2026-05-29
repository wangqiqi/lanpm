import assert from 'node:assert/strict'
import {
  isTextPreviewFile,
  supportsInlinePreview,
  TEXT_PREVIEW_EXTENSIONS
} from '../../src/shared/file/previewExtensions.ts'

assert.ok(TEXT_PREVIEW_EXTENSIONS.has('yaml'))
assert.ok(TEXT_PREVIEW_EXTENSIONS.has('yml'))
assert.ok(TEXT_PREVIEW_EXTENSIONS.has('xml'))
assert.ok(TEXT_PREVIEW_EXTENSIONS.has('ini'))
assert.ok(TEXT_PREVIEW_EXTENSIONS.has('toml'))

assert.equal(isTextPreviewFile('config.yaml', 'yaml'), true)
assert.equal(isTextPreviewFile('app.yml', 'yml'), true)
assert.equal(isTextPreviewFile('settings.xml', 'xml'), true)
assert.equal(isTextPreviewFile('app.ini', 'ini'), true)
assert.equal(isTextPreviewFile('Dockerfile', 'bin'), true)
assert.equal(isTextPreviewFile('.env', 'bin'), true)
assert.equal(isTextPreviewFile('.env.local', 'local'), true)

assert.equal(supportsInlinePreview({ name: 'a.png', ext: 'png' }), true)
assert.equal(supportsInlinePreview({ name: 'a.pdf', ext: 'pdf' }), true)
assert.equal(supportsInlinePreview({ name: 'a.docx', ext: 'docx' }), false)

console.log('verify:preview-extensions OK')
