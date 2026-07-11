import { describe, expect, it } from 'vitest'
import { mergeLinkedFileId } from '@shared/task/linkFile'

describe('mergeLinkedFileId', () => {
  it('appends and dedupes', () => {
    expect(mergeLinkedFileId(undefined, 'f1')).toEqual(['f1'])
    expect(mergeLinkedFileId(['f1'], 'f2')).toEqual(['f1', 'f2'])
    expect(mergeLinkedFileId(['f1'], 'f1')).toEqual(['f1'])
  })
})
