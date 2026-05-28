import type { Database } from 'better-sqlite3'
import { assertGroupAllowsFiles } from '../../shared/group/guards'
import { resolveGroupType } from '../group/groupService'

export function assertFileWritable(db: Database, groupId: string): void {
  assertGroupAllowsFiles(resolveGroupType(db, groupId), groupId)
}
