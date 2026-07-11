/**
 * docs/03 — group tag dictionary meta + `group_tag_patch` LWW (TASK-189+).
 * Color authority per group; chips fall back to tagColorHash when missing.
 */

import { TASK_TAG_MAX_LENGTH, taskTagKey } from './tags.ts'

export type GroupTagPatchAction = 'upsert' | 'delete'

/** Persisted / synced tag color entry for a group. */
export interface GroupTagMeta {
  groupId: string
  /** Normalized lowercase key */
  tagKey: string
  /** Optional display casing; defaults to tagKey */
  label?: string
  /** `#RRGGBB` */
  color: string
  updatedAt: string
  updatedByUserId?: string
}

export interface GroupTagPatchPayload {
  action: GroupTagPatchAction
  groupId: string
  tagKey: string
  /** Required for upsert */
  color?: string
  label?: string
  /** ISO8601 — LWW */
  updatedAt: string
  updatedByUserId?: string
}

const HEX_RE = /^#[0-9A-Fa-f]{6}$/
const ISO_RE = /^\d{4}-\d{2}-\d{2}T/

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isGroupTagColor(value: unknown): value is string {
  return typeof value === 'string' && HEX_RE.test(value.trim())
}

export function normalizeGroupTagKey(raw: string): string {
  return taskTagKey(raw).slice(0, TASK_TAG_MAX_LENGTH)
}

export function isGroupTagMeta(value: unknown): value is GroupTagMeta {
  if (!isRecord(value)) return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.tagKey !== 'string' || !value.tagKey) return false
  if (value.tagKey !== normalizeGroupTagKey(value.tagKey)) return false
  if (!isGroupTagColor(value.color)) return false
  if (typeof value.updatedAt !== 'string' || !value.updatedAt) return false
  if (value.label !== undefined && typeof value.label !== 'string') return false
  if (value.updatedByUserId !== undefined && typeof value.updatedByUserId !== 'string') {
    return false
  }
  return true
}

export function isGroupTagPatchPayload(value: unknown): value is GroupTagPatchPayload {
  if (!isRecord(value)) return false
  if (value.action !== 'upsert' && value.action !== 'delete') return false
  if (typeof value.groupId !== 'string' || !value.groupId) return false
  if (typeof value.tagKey !== 'string' || !normalizeGroupTagKey(value.tagKey)) return false
  if (typeof value.updatedAt !== 'string' || !value.updatedAt) return false
  if (value.action === 'upsert') {
    if (!isGroupTagColor(value.color)) return false
  }
  if (value.label !== undefined && typeof value.label !== 'string') return false
  if (value.updatedByUserId !== undefined && typeof value.updatedByUserId !== 'string') {
    return false
  }
  return true
}

/** Build color override map (tagKey → color) from meta rows. */
export function groupTagMetaToColorMap(
  rows: readonly GroupTagMeta[]
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const row of rows) {
    out[row.tagKey] = row.color.trim()
  }
  return out
}

/** Soft check for ISO-ish timestamps used in LWW compare. */
export function isLikelyIsoTimestamp(value: string): boolean {
  return ISO_RE.test(value) && !Number.isNaN(Date.parse(value))
}
