import { describe, expect, it } from 'vitest'
import type { Task } from '@shared/task/types'
import {
  buildTaskSearchKeys,
  extractTaskRefQuery,
  filterTasksByQuery,
  parseStandaloneTaskRef,
  resolveComposerTaskLink,
  resolveStandaloneTaskRefForSend,
  resolveComposerTaskLink,
  splitTaskRefSegments,
  taskMatchesQuery
} from '@shared/chat/taskRefs'

const base = (overrides: Partial<Task>): Task => ({
  taskId: 'task_1',
  groupId: 'g1',
  title: 'Fix Login UI',
  status: 'todo',
  priority: 'medium',
  progressPercent: 0,
  sortOrder: 0,
  createdBy: 'u1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides
})

const tasks: Task[] = [
  base({ taskId: 'task_a', title: 'Fix Login UI' }),
  base({ taskId: 'task_b', title: '部署文档' }),
  base({ taskId: 'task_c', title: 'API Review', status: 'doing' })
]

describe('taskRefs', () => {
  it('extracts # query at end of draft', () => {
    expect(extractTaskRefQuery('hello #fix')).toBe('fix')
    expect(extractTaskRefQuery('@bob #dep')).toBe('dep')
    expect(extractTaskRefQuery('plain text')).toBeNull()
  })

  it('builds search keys with word initials', () => {
    expect(buildTaskSearchKeys('Fix Login UI')).toContain('flu')
  })

  it('matches title substring and initials', () => {
    expect(taskMatchesQuery(tasks[0]!, 'login')).toBe(true)
    expect(taskMatchesQuery(tasks[0]!, 'flu')).toBe(true)
    expect(taskMatchesQuery(tasks[0]!, 'fix')).toBe(true)
    expect(taskMatchesQuery(tasks[1]!, '部署')).toBe(true)
    expect(taskMatchesQuery(tasks[2]!, 'api')).toBe(true)
    expect(taskMatchesQuery(tasks[0]!, 'zzz')).toBe(false)
  })

  it('filters tasks by query', () => {
    expect(filterTasksByQuery(tasks, 'login').map((t) => t.taskId)).toEqual(['task_a'])
    expect(filterTasksByQuery(tasks, '').length).toBe(3)
  })

  it('parses standalone #task message', () => {
    expect(parseStandaloneTaskRef('#Fix Login UI', tasks)?.taskId).toBe('task_a')
    expect(parseStandaloneTaskRef('please #Fix Login UI', tasks)).toBeNull()
    expect(parseStandaloneTaskRef('#Fix Login UI @Alice', tasks)).toBeNull()
    expect(parseStandaloneTaskRef('/task new', tasks)).toBeNull()
  })

  it('resolves picked task id when title matches', () => {
    expect(
      resolveStandaloneTaskRefForSend('#部署文档', tasks, 'task_b')?.taskId
    ).toBe('task_b')
  })

  it('resolves composer task link for file attach', () => {
    expect(resolveComposerTaskLink('attach #Fix Login UI', tasks, 'task_a')).toBe('task_a')
    expect(resolveComposerTaskLink('attach #Fix Login UI', tasks, null)).toBe('task_a')
    expect(resolveComposerTaskLink('no ref here', tasks, 'task_a')).toBeUndefined()
  })

  it('splits inline task refs for rendering', () => {
    const segments = splitTaskRefSegments('see #Fix Login UI today', tasks)
    const ref = segments.find((s) => s.kind === 'taskRef')
    expect(ref?.taskId).toBe('task_a')
    expect(ref?.value).toBe('#Fix Login UI')
  })
})
