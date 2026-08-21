import { describe, expect, it } from 'vitest'
import {
  buildGanttTableRows,
  csvEscapeField,
  ganttTableToCsv,
  ganttTableToMarkdown
} from '@shared/task/ganttTableExport'
import type { Task } from '@shared/task/types'
import type { TaskDependency } from '@shared/task/dependency'

function task(
  partial: Partial<Task> & Pick<Task, 'taskId' | 'title'> & { deps?: TaskDependency[] }
): Task {
  const { deps, ...rest } = partial
  return {
    groupId: 'g1',
    status: 'doing',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 0,
    createdBy: 'u1',
    createdAt: 't',
    updatedAt: 't',
    dependencies: deps,
    ...rest
  }
}

describe('buildGanttTableRows', () => {
  it('skips deleted tasks and formats FS predecessors', () => {
    const a = task({ taskId: 'a', title: 'Alpha', startDate: '2026-01-01', endDate: '2026-01-02' })
    const b = task({
      taskId: 'b',
      title: 'Beta',
      startDate: '2026-01-03',
      endDate: '2026-01-04',
      deps: [{ fromTaskId: 'a', toTaskId: 'b', type: 'FS' }]
    })
    const gone = task({ taskId: 'x', title: 'Gone', deletedAt: 't' })
    const rows = buildGanttTableRows([a, b, gone])
    expect(rows).toHaveLength(2)
    expect(rows[1]).toMatchObject({
      taskId: 'b',
      predecessors: 'a(FS)',
      durationDays: '2'
    })
  })
})

describe('ganttTableToCsv', () => {
  it('writes UTF-8 BOM and quotes commas', () => {
    const csv = ganttTableToCsv([
      {
        taskId: 'a',
        title: 'Hello, world',
        status: 'todo',
        startDate: '',
        endDate: '',
        durationDays: '',
        predecessors: ''
      }
    ])
    expect(csv.startsWith('\uFEFF')).toBe(true)
    expect(csv).toContain('"Hello, world"')
    expect(csv).toContain('taskId,title,status')
  })

  it('escapes quotes inside fields', () => {
    expect(csvEscapeField('say "hi"')).toBe('"say ""hi"""')
  })
})

describe('ganttTableToMarkdown', () => {
  it('emits a heading and pipe table', () => {
    const md = ganttTableToMarkdown(
      [
        {
          taskId: 'a',
          title: 'Pipe | title',
          status: 'todo',
          startDate: '2026-01-01',
          endDate: '2026-01-01',
          durationDays: '1',
          predecessors: ''
        }
      ],
      { heading: 'Group A' }
    )
    expect(md.startsWith('# Group A\n')).toBe(true)
    expect(md).toContain('| taskId | title |')
    expect(md).toContain('Pipe \\| title')
  })
})
