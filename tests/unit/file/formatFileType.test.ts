import { describe, expect, it } from 'vitest'
import { formatFileTypeLabel } from '@shared/file/formatFileType'

const labels = {
  document: '文档',
  image: '图片',
  video: '视频',
  code: '代码',
  bookmark: '书签',
  other: '其他'
}

describe('formatFileTypeLabel', () => {
  it('uses extension label when known', () => {
    expect(
      formatFileTypeLabel(
        { name: 'app.yaml', ext: 'yaml', category: 'code', isBookmark: false },
        labels
      )
    ).toBe('YAML')
  })

  it('recognizes Dockerfile by name', () => {
    expect(
      formatFileTypeLabel(
        { name: 'Dockerfile', ext: 'bin', category: 'other', isBookmark: false },
        labels
      )
    ).toBe('Dockerfile')
  })

  it('falls back to category label', () => {
    expect(
      formatFileTypeLabel(
        { name: 'unknown.bin', ext: 'bin', category: 'other', isBookmark: false },
        labels
      )
    ).toBe('其他')
  })
})
