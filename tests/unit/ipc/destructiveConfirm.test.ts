import { describe, expect, it } from 'vitest'
import { destructiveConfirmCopy } from '../../../src/main/ipc/destructiveConfirm.ts'

describe('destructiveConfirmCopy', () => {
  it('uses zh copy for zh locale', () => {
    const c = destructiveConfirmCopy('resetIdentity', 'zh-CN')
    expect(c.confirm).toBe('重置')
    expect(c.cancel).toBe('取消')
  })

  it('uses en copy otherwise', () => {
    const c = destructiveConfirmCopy('dissolve', 'en-US')
    expect(c.confirm).toBe('Dissolve')
  })
})
