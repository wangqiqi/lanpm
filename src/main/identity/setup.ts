import type { Database } from 'better-sqlite3'
import {
  getDeviceById,
  getUserById,
  upsertDevice,
  upsertUser
} from '../storage'
import { getMeta, setMeta } from '../storage/repositories/syncMetaRepository'
import type { LocalDevice, UserProfile } from '../storage/types'
import { newDeviceId } from './idGen'
import { allocateUserIdWithLanCheck } from './suffixValidation'

export const LOCAL_DEVICE_ID_KEY = 'local_device_id'

export interface SetupInput {
  baseName: string
  deviceName: string
  department?: string
  avatarUrl?: string
}

export interface SetupStatus {
  configured: boolean
  user?: UserProfile
  device?: LocalDevice
}

export function getLocalDeviceId(db: Database): string | null {
  return getMeta(db, LOCAL_DEVICE_ID_KEY)
}

export function getSetupStatus(db: Database): SetupStatus {
  const deviceId = getLocalDeviceId(db)
  if (!deviceId) return { configured: false }

  const device = getDeviceById(db, deviceId)
  if (!device) return { configured: false }

  const user = getUserById(db, device.userId)
  if (!user) return { configured: false }

  return { configured: true, user, device }
}

export function completeSetup(db: Database, input: SetupInput): SetupStatus {
  const baseName = input.baseName.trim()
  const deviceName = input.deviceName.trim()
  if (baseName.length < 2 || baseName.length > 20) {
    throw new Error('用户名须为 2–20 个字符')
  }
  if (deviceName.length < 1 || deviceName.length > 30) {
    throw new Error('设备名称须为 1–30 个字符')
  }

  const { userId, suffix, displayName } = allocateUserIdWithLanCheck(db, baseName)
  const now = new Date().toISOString()

  const profile: UserProfile = {
    userId,
    displayName,
    baseName,
    suffix,
    department: input.department?.trim() || undefined,
    avatarUrl: input.avatarUrl,
    createdAt: now,
    updatedAt: now
  }

  const deviceId = newDeviceId()
  const device: LocalDevice = {
    deviceId,
    deviceName,
    userId,
    lastSeenAt: now
  }

  upsertUser(db, profile)
  upsertDevice(db, device)
  setMeta(db, LOCAL_DEVICE_ID_KEY, deviceId)

  return { configured: true, user: profile, device }
}
