import { describe, expect, it } from 'vitest'
import {
  searchMessagesInDocs,
  searchTasksInDocs,
  type MessageSearchDoc,
  type TaskSearchDoc
} from '../../../src/main/search/miniSearchIndex.ts'

const tasks: TaskSearchDoc[] = [
  { id: 't1', kind: 'task', groupId: 'g1', title: 'Fix login timeout', body: 'Fix login timeout' },
  { id: 't2', kind: 'task', groupId: 'g1', title: 'Write CHANGELOG', body: 'Write CHANGELOG' },
  { id: 't3', kind: 'task', groupId: 'g2', title: '修复登录超时', body: '修复登录超时' }
]

const messages: MessageSearchDoc[] = [
  { id: 'm1', kind: 'message', groupId: 'g1', body: 'please review the login patch' },
  { id: 'm2', kind: 'message', groupId: 'g1', body: 'unrelated standup notes' },
  { id: 'm3', kind: 'message', groupId: 'g2', body: '登录补丁已合入' }
]

describe('searchTasksInDocs', () => {
  it('matches English title via MiniSearch', () => {
    const hits = searchTasksInDocs(tasks, 'login', 8)
    expect(hits.map((h) => h.taskId)).toEqual(['t1'])
    expect(hits[0]?.title).toBe('Fix login timeout')
    expect(hits[0]?.groupId).toBe('g1')
  })

  it('matches CJK unigrams without a custom 3rd/ tokenizer', () => {
    const hits = searchTasksInDocs(tasks, '登录', 8)
    expect(hits.map((h) => h.taskId)).toEqual(['t3'])
  })

  it('respects limit and ignores empty query', () => {
    expect(searchTasksInDocs(tasks, '   ', 8)).toEqual([])
    expect(searchTasksInDocs(tasks, 'Fix', 1)).toHaveLength(1)
  })
})

describe('searchMessagesInDocs', () => {
  it('returns snippet around the query', () => {
    const hits = searchMessagesInDocs(messages, 'login', 8)
    expect(hits.map((h) => h.msgId)).toEqual(['m1'])
    expect(hits[0]?.snippet.toLowerCase()).toContain('login')
  })

  it('matches CJK message body', () => {
    const hits = searchMessagesInDocs(messages, '补丁', 8)
    expect(hits.map((h) => h.msgId)).toEqual(['m3'])
  })
})
