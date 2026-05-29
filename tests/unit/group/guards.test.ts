import { describe, expect, it } from 'vitest'
import {
  assertGroupAllowsFiles,
  assertGroupAllowsTasks,
  isAnonymousGroupType
} from '@shared/group/guards'

describe('isAnonymousGroupType', () => {
  it('detects anonymous groups', () => {
    expect(isAnonymousGroupType('anonymous')).toBe(true)
    expect(isAnonymousGroupType('project')).toBe(false)
  })
})

describe('assertGroupAllowsTasks', () => {
  it('allows project groups', () => {
    expect(() => assertGroupAllowsTasks('project')).not.toThrow()
  })

  it('blocks anonymous and function groups', () => {
    expect(() => assertGroupAllowsTasks('anonymous')).toThrow('匿名群不支持任务')
    expect(() => assertGroupAllowsTasks('function')).toThrow('职能群不支持看板任务')
  })
})

describe('assertGroupAllowsFiles', () => {
  it('allows project files', () => {
    expect(() => assertGroupAllowsFiles('project')).not.toThrow()
  })

  it('blocks dm and anonymous', () => {
    expect(() => assertGroupAllowsFiles('project', 'dm:alice__bob')).toThrow('私聊不支持文件')
    expect(() => assertGroupAllowsFiles('anonymous')).toThrow('匿名群不支持文件')
  })
})
