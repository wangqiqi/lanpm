import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const cockpitSrc = readFileSync(join(root, 'src/main/cockpit/cockpitService.ts'), 'utf8')
const taskRepoSrc = readFileSync(join(root, 'src/main/storage/repositories/taskRepository.ts'), 'utf8')

describe('buildCockpitDashboard query shape', () => {
  it('loads project tasks + assignee dept in one JOIN instead of N+1', () => {
    const start = cockpitSrc.indexOf('export function buildCockpitDashboard')
    const end = cockpitSrc.indexOf('function desensitizeTasks')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const body = cockpitSrc.slice(start, end)
    expect(body).toContain('listProjectTasksWithAssigneeMeta')
    expect(body).not.toMatch(/listTasksByGroup/)
    expect(body).not.toMatch(/getUserById/)
    expect(taskRepoSrc).toMatch(/LEFT JOIN users u ON u\.user_id = t\.assignee_user_id/)
    expect(taskRepoSrc).toMatch(/g\.type = 'project'/)
  })
})
