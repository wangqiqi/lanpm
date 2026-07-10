import { describe, expect, it } from 'vitest'
import { matchesGroupSearch } from '@shared/group/matchGroupSearch'

describe('matchesGroupSearch', () => {
  it('empty query matches all', () => {
    expect(matchesGroupSearch('演示 · 项目群', '')).toBe(true)
    expect(matchesGroupSearch('演示 · 项目群', '   ')).toBe(true)
  })

  it('matches Chinese substring', () => {
    expect(matchesGroupSearch('演示 · 项目群', '演示')).toBe(true)
    expect(matchesGroupSearch('演示 · 项目群', '项目')).toBe(true)
    expect(matchesGroupSearch('演示 · 项目群', '职能')).toBe(false)
  })

  it('matches case-insensitive Latin', () => {
    expect(matchesGroupSearch('Alpha Project', 'alpha')).toBe(true)
    expect(matchesGroupSearch('Alpha Project', 'PROJ')).toBe(true)
  })

  it('matches pinyin initials', () => {
    expect(matchesGroupSearch('演示 · 项目群', 'ys')).toBe(true)
    expect(matchesGroupSearch('演示 · 项目群', 'xm')).toBe(true)
    expect(matchesGroupSearch('演示 · 项目群', 'xmq')).toBe(true)
  })

  it('matches pinyin full spelling', () => {
    expect(matchesGroupSearch('演示 · 项目群', 'yanshi')).toBe(true)
    expect(matchesGroupSearch('演示 · 项目群', 'xiangmu')).toBe(true)
  })

  it('rejects unrelated pinyin', () => {
    expect(matchesGroupSearch('演示 · 项目群', 'zn')).toBe(false)
    expect(matchesGroupSearch('演示 · 项目群', 'zzzz')).toBe(false)
  })
})
