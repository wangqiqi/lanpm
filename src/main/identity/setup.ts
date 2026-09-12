import type { Database } from 'better-sqlite3'
import { throwLanpm } from '../../shared/errors/lanpmError'
import { hostname } from 'node:os'
import { resolveDeviceName } from '../../shared/identity/deviceName'
import type { ProfileUpdateInput, ReactivateInput, SetupInput, SetupStatus } from '../../shared/identity'
import { normalizeAvatarDataUrl } from '../../shared/identity/avatar'
import {
  getDeviceById,
  getUserById,
  upsertDevice,
  upsertUser
} from '../storage'
import {
  clearActiveProfileBinding,
  getPendingRebindFromDisk,
  getRootUserDataPath
} from '../storage/profilePaths'
import { deleteMeta, getMeta, setMeta } from '../storage/repositories/syncMetaRepository'
import type { LocalDevice, UserProfile } from '../storage/types'
import { newDeviceId } from './idGen'
import { allocateUserIdWithLanCheck } from './suffixValidation'
import { clearRebindHint, readRebindHint, writeRebindHint } from './rebindHint'

export const LOCAL_DEVICE_ID_KEY = 'local_device_id'

export type { ProfileUpdateInput, ReactivateInput, SetupInput, SetupStatus }

function profileToSetupUser(profile: UserProfile): SetupStatus['user'] {
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    baseName: profile.baseName,
    suffix: profile.suffix,
    department: profile.department,
    avatarUrl: normalizeAvatarDataUrl(profile.avatarUrl)
  }
}

function buildDisplayName(baseName: string, suffix?: string): string {
  return suffix ? `${baseName}${suffix}` : baseName
}

function pendingRebindStatus(): SetupStatus['pendingRebind'] | undefined {
  const pending = getPendingRebindFromDisk()
  if (!pending) return undefined
  return {
    userId: pending.userId,
    deviceId: pending.deviceId,
    user: profileToSetupUser(pending.user)!
  }
}

export function getSuggestedDeviceName(): string {
  return resolveDeviceName(hostname())
}

export function getLocalDeviceId(db: Database): string | null {
  return getMeta(db, LOCAL_DEVICE_ID_KEY)
}

/** 当前本机登录身份 user_id；AI 密钥等仅按此隔离，不同步群组 */
export function getLocalUserId(db: Database): string | null {
  const deviceId = getLocalDeviceId(db)
  if (!deviceId) return null
  return getDeviceById(db, deviceId)?.userId ?? null
}

export function getSetupStatus(db: Database): SetupStatus {
  const deviceId = getLocalDeviceId(db)
  if (!deviceId) {
    return {
      configured: false,
      suggestedDeviceName: getSuggestedDeviceName(),
      pendingRebind: pendingRebindStatus()
    }
  }

  const device = getDeviceById(db, deviceId)
  if (!device) {
    return {
      configured: false,
      suggestedDeviceName: getSuggestedDeviceName(),
      pendingRebind: pendingRebindStatus()
    }
  }

  const user = getUserById(db, device.userId)
  if (!user) {
    return {
      configured: false,
      suggestedDeviceName: getSuggestedDeviceName(),
      pendingRebind: pendingRebindStatus()
    }
  }

  return { configured: true, user: profileToSetupUser(user), device }
}

export function completeSetup(db: Database, input: SetupInput): SetupStatus {
  const root = getRootUserDataPath()
  const hint = readRebindHint(root)
  if (hint && input.intent !== 'new_user') {
    throwLanpm('err.useReactivateForExistingIdentity')
  }
  if (input.intent === 'new_user') {
    clearRebindHint(root)
  }

  const baseName = input.baseName.trim()
  const deviceName = getSuggestedDeviceName()
  if (baseName.length < 2 || baseName.length > 20) {
    throwLanpm('err.usernameLength')
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

  return { configured: true, user: profileToSetupUser(profile), device }
}

export function reactivateLocalIdentity(db: Database, input?: ReactivateInput): SetupStatus {
  const root = getRootUserDataPath()
  const hint = readRebindHint(root)
  if (!hint) {
    throwLanpm('err.rebindNotAvailable')
  }

  const device = getDeviceById(db, hint.deviceId)
  const existing = getUserById(db, hint.userId)
  if (!device || device.userId !== hint.userId || !existing) {
    throwLanpm('err.rebindNotAvailable')
  }

  let profile = existing
  if (input?.baseName !== undefined) {
    const baseName = input.baseName.trim()
    if (baseName.length < 2 || baseName.length > 20) {
      throwLanpm('err.usernameLength')
    }
    const now = new Date().toISOString()
    profile = {
      ...existing,
      baseName,
      displayName: buildDisplayName(baseName, existing.suffix),
      department: input.department?.trim() || undefined,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl,
      updatedAt: now
    }
    upsertUser(db, profile)
  } else if (input?.department !== undefined || input?.avatarUrl !== undefined) {
    const now = new Date().toISOString()
    profile = {
      ...existing,
      department: input.department?.trim() || undefined,
      avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl,
      updatedAt: now
    }
    upsertUser(db, profile)
  }

  const now = new Date().toISOString()
  const refreshedDevice: LocalDevice = {
    ...device,
    deviceName: getSuggestedDeviceName(),
    lastSeenAt: now
  }
  upsertDevice(db, refreshedDevice)
  setMeta(db, LOCAL_DEVICE_ID_KEY, hint.deviceId)
  clearRebindHint(root)

  return {
    configured: true,
    user: profileToSetupUser(profile),
    device: refreshedDevice
  }
}

export function updateProfile(db: Database, input: ProfileUpdateInput): SetupStatus {
  const status = getSetupStatus(db)
  if (!status.configured || !status.user || !status.device) {
    throwLanpm('stub.identityRequired')
  }

  const baseName = input.baseName.trim()
  if (baseName.length < 2 || baseName.length > 20) {
    throwLanpm('err.usernameLength')
  }

  const existing = getUserById(db, status.user.userId)
  if (!existing) {
    throwLanpm('err.profileNotFound')
  }

  const now = new Date().toISOString()
  const profile: UserProfile = {
    ...existing,
    baseName,
    displayName: buildDisplayName(baseName, existing.suffix),
    department: input.department?.trim() || undefined,
    avatarUrl: input.avatarUrl !== undefined ? input.avatarUrl : existing.avatarUrl,
    updatedAt: now
  }

  upsertUser(db, profile)
  return { configured: true, user: profileToSetupUser(profile), device: status.device }
}

/** 清除本机身份绑定，回到 Setup 向导（用户/设备记录保留于库中） */
export function resetIdentity(db: Database): SetupStatus {
  const deviceId = getLocalDeviceId(db)
  const userId = deviceId ? getDeviceById(db, deviceId)?.userId : null
  if (userId && deviceId) {
    writeRebindHint(getRootUserDataPath(), { userId, deviceId })
  }
  deleteMeta(db, LOCAL_DEVICE_ID_KEY)
  clearActiveProfileBinding()
  const status = getSetupStatus(db)
  return userId ? { ...status, needsRelaunch: true } : status
}
