import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, it } from 'vitest'
import {
  GROUP_TAG_OFFLINE_SYNC_BATCH_LIMIT,
  isGroupTagSyncBatchPayload,
  isGroupTagSyncRequestPayload,
  maxUpdatedAtInGroupTags,
  splitGroupTagOfflineSyncPage,
  type GroupTagMeta
} from '../../../src/shared/task/groupTagMeta'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

const tag = (tagKey: string, updatedAt: string, extras: Partial<GroupTagMeta> = {}): GroupTagMeta => ({
  groupId: extras.groupId ?? 'g1',
  tagKey,
  color: extras.color ?? '#aabbcc',
  updatedAt,
  ...extras
})

describe('group tag offline sync payloads (TASK-4101)', () => {
  it('accepts request with exclusive since + min cutoff', () => {
    expect(
      isGroupTagSyncRequestPayload({
        sinceUpdatedAt: '2026-08-01T00:00:00.000Z',
        minUpdatedAt: '2026-08-13T00:00:00.000Z'
      })
    ).toBe(true)
    expect(isGroupTagSyncRequestPayload({ sinceUpdatedAt: '', minUpdatedAt: 'x' })).toBe(true)
    expect(isGroupTagSyncRequestPayload({ sinceUpdatedAt: 'a' })).toBe(false)
    expect(isGroupTagSyncRequestPayload({ minUpdatedAt: '' })).toBe(false)
  })

  it('accepts batch of GroupTagMeta rows', () => {
    const tags = [tag('api', '2026-08-20T00:00:00.000Z')]
    expect(isGroupTagSyncBatchPayload({ tags })).toBe(true)
    expect(isGroupTagSyncBatchPayload({ tags, hasMore: false })).toBe(true)
    expect(isGroupTagSyncBatchPayload({ tags: [{ ...tags[0], tagKey: 'API' }] })).toBe(false)
    expect(isGroupTagSyncBatchPayload({ tags: 'nope' })).toBe(false)
    expect(isGroupTagSyncBatchPayload({ tags, hasMore: 'yes' })).toBe(false)
  })

  it('pages by LIMIT and reports hasMore', () => {
    const rows = Array.from({ length: 3 }, (_, i) => tag(`t${i}`, `2026-08-20T00:0${i}:00.000Z`))
    expect(splitGroupTagOfflineSyncPage(rows, 2)).toEqual({
      tags: rows.slice(0, 2),
      hasMore: true
    })
    expect(splitGroupTagOfflineSyncPage(rows, 3).hasMore).toBe(false)
    expect(GROUP_TAG_OFFLINE_SYNC_BATCH_LIMIT).toBe(200)
  })

  it('tracks max updatedAt for pagination cursor', () => {
    expect(
      maxUpdatedAtInGroupTags([
        tag('a', '2026-08-20T01:00:00.000Z'),
        tag('b', '2026-08-20T03:00:00.000Z'),
        tag('c', '2026-08-20T02:00:00.000Z')
      ])
    ).toBe('2026-08-20T03:00:00.000Z')
    expect(maxUpdatedAtInGroupTags([])).toBe('')
  })
})

describe('listGroupTagsSince + offline service source (TASK-4102)', () => {
  it('queries by group_id, since/min updated_at, and LIMIT', () => {
    const src = readFileSync(
      join(root, 'src/main/storage/repositories/groupTagMetaRepository.ts'),
      'utf8'
    )
    const start = src.indexOf('function listGroupTagsSince')
    expect(start).toBeGreaterThanOrEqual(0)
    const fn = src.slice(start, start + 900)
    expect(fn).toMatch(/updated_at > \?/)
    expect(fn).toMatch(/updated_at >= \?/)
    expect(fn).toMatch(/group_id = \?/)
    expect(fn).toMatch(/LIMIT \?/)
    expect(fn).toMatch(/ORDER BY updated_at ASC/)
    expect(src).toMatch(/function getMaxGroupTagUpdatedAt/)
  })

  it('service requests, pages, and LWW-upserts batches', () => {
    const src = readFileSync(
      join(root, 'src/main/task/groupTagOfflineSyncService.ts'),
      'utf8'
    )
    expect(src).toMatch(/export async function requestGroupTagOfflineSync/)
    expect(src).toMatch(/export async function handleGroupTagSyncRequest/)
    expect(src).toMatch(/export function handleGroupTagSyncBatch/)
    expect(src).toMatch(/type: 'group_tag_sync_request'/)
    expect(src).toMatch(/type: 'group_tag_sync_batch'/)
    expect(src).toMatch(/applyRemoteGroupTagUpsert/)
    expect(src).toMatch(/listGroupTagsSince/)
  })
})
