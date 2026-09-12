import type { SetupIntent } from './identity/lifecycle'

export type { IdentityLifecycleAction, SetupIntent } from './identity/lifecycle'

export interface SetupInput {
  baseName: string
  department?: string
  avatarUrl?: string
  /** 默认省略：有 rebind 提示时应走 `reactivateLocalIdentity`，勿静默 `allocateUserId` */
  intent?: SetupIntent
}

/** 注销后「继续原身份」；字段均可选（仅更新时传） */
export interface ReactivateInput {
  baseName?: string
  department?: string
  avatarUrl?: string
}

/** 已配置用户修改显示名/部门（userId 不变，后缀保留） */
export interface ProfileUpdateInput {
  baseName: string
  department?: string
  avatarUrl?: string
}

export interface SetupUserView {
  userId: string
  displayName: string
  baseName: string
  suffix?: string
  department?: string
  avatarUrl?: string
}

export interface SetupDeviceView {
  deviceId: string
  deviceName: string
}

export interface PendingRebindView {
  userId: string
  deviceId: string
  user: SetupUserView
}

export interface SetupStatus {
  configured: boolean
  /** 未配置时由主进程/桩返回，供向导展示自动识别的设备名 */
  suggestedDeviceName?: string
  /** 注销后复绑提示（同 userId） */
  pendingRebind?: PendingRebindView
  /** 已清 active_profile 但进程仍停在原 profile 目录时建议重启 */
  needsRelaunch?: boolean
  user?: SetupUserView
  device?: SetupDeviceView
}
