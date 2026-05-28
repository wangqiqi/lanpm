import type { Database } from 'better-sqlite3'
import {
  allocateUserId,
  validateManualUserId,
  type AllocatedUserId,
  type ManualUserIdValidation
} from './idGen'
import { userIdExists } from '../storage'
import { getKnownLanUserIds } from '../network/peerDirectory'

export function createUserIdExistsChecker(db: Database): (userId: string) => boolean {
  return (userId) => userIdExists(db, userId) || getKnownLanUserIds().has(userId)
}

export function allocateUserIdWithLanCheck(
  db: Database,
  baseName: string,
  now?: Date
): AllocatedUserId {
  const exists = createUserIdExistsChecker(db)
  return allocateUserId(baseName, exists, now)
}

export function validateUserIdAvailability(
  db: Database,
  userId: string
): ManualUserIdValidation {
  const exists = createUserIdExistsChecker(db)
  return validateManualUserId(userId, exists)
}
