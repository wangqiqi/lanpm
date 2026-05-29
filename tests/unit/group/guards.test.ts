import { describe, expect, it } from 'vitest'
import {
  assertGroupAllowsFiles,
  assertGroupAllowsTasks,
  groupAllowsDirectMessage,
  isAnonymousGroupType,
  isMemoryOnlyChatGroup
} from '@shared/group/guards'

describe('isAnonymousGroupType', () => {
  it('detects anonymous groups', () => {
    expect(isAnonymousGroupType('anonymous')).toBe(true)
    expect(isAnonymousGroupType('project')).toBe(false)
  })
})

describe('groupAllowsDirectMessage', () => {
  it('blocks anonymous origins only', () => {
    expect(groupAllowsDirectMessage('project')).toBe(true)
    expect(groupAllowsDirectMessage('function')).toBe(true)
    expect(groupAllowsDirectMessage('anonymous')).toBe(false)
  })
})

describe('assertGroupAllowsTasks', () => {
  it('allows project groups', () => {
    expect(() => assertGroupAllowsTasks('project')).not.toThrow()
  })

  it('blocks anonymous and function groups', () => {
    expect(() => assertGroupAllowsTasks('anonymous')).toThrow('stub.anonymousNoTask')
    expect(() => assertGroupAllowsTasks('function')).toThrow('stub.functionNoTask')
  })
})

describe('assertGroupAllowsFiles', () => {
  it('allows project and dm files', () => {
    expect(() => assertGroupAllowsFiles('project')).not.toThrow()
    expect(() => assertGroupAllowsFiles('project', 'dm:alice__bob')).not.toThrow()
  })

  it('blocks anonymous', () => {
    expect(() => assertGroupAllowsFiles('anonymous')).toThrow('err.anonymousNoFile')
  })

  it('allows function group files', () => {
    expect(() => assertGroupAllowsFiles('function')).not.toThrow()
  })
})

describe('isMemoryOnlyChatGroup', () => {
  it('treats dm as persisted chat', () => {
    expect(isMemoryOnlyChatGroup('dm:alice__bob', 'anonymous')).toBe(false)
    expect(isMemoryOnlyChatGroup('demo-anonymous', 'anonymous')).toBe(true)
  })
})
