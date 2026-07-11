import { describe, expect, it } from 'vitest'
import { whiteboardPathForTask } from '@shared/whiteboard/paths'

describe('whiteboardPathForTask', () => {
  it('builds group whiteboard path', () => {
    expect(whiteboardPathForTask('demo-project')).toBe('/g/demo-project/whiteboard')
  })

  it('appends linkTask query', () => {
    expect(whiteboardPathForTask('g1', 'task/a')).toBe(
      '/g/g1/whiteboard?linkTask=task%2Fa'
    )
  })
})
