import assert from 'node:assert/strict'
import { formatFileTypeLabel } from '../../src/shared/file/formatFileType.ts'

const labels = {
  document: '文档',
  image: '图片',
  video: '视频',
  code: '代码',
  bookmark: '书签',
  other: '其他'
}

assert.equal(formatFileTypeLabel({ name: 'app.yaml', ext: 'yaml', category: 'code', isBookmark: false }, labels), 'YAML')
assert.equal(formatFileTypeLabel({ name: 'config.xml', ext: 'xml', category: 'other', isBookmark: false }, labels), 'XML')
assert.equal(formatFileTypeLabel({ name: 'Dockerfile', ext: 'bin', category: 'other', isBookmark: false }, labels), 'Dockerfile')

console.log('verify:format-file-type OK')
