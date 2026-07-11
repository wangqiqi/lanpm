import { describe, expect, it } from 'vitest'
import { mergeLinkedFileId, removeLinkedFileId } from '@shared/task/linkFile'

describe('mergeLinkedFileId', () => {
  it('appends and dedupes', () => {
    expect(mergeLinkedFileId(undefined, 'f1')).toEqual(['f1'])
    expect(mergeLinkedFileId(['f1'], 'f2')).toEqual(['f1', 'f2'])
    expect(mergeLinkedFileId(['f1'], 'f1')).toEqual(['f1'])
  })
})

describe('removeLinkedFileId', () => {
  it('removes and keeps others', () => {
    expect(removeLinkedFileId(['f1', 'f2'], 'f1')).toEqual(['f2'])
    expect(removeLinkedFileId(['f1'], 'f1')).toEqual([])
    expect(removeLinkedFileId(undefined, 'f1')).toEqual([])
  })
})
