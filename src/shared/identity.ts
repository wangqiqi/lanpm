export interface SetupInput {
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

export interface SetupStatus {
  configured: boolean
  /** 未配置时由主进程/桩返回，供向导展示自动识别的设备名 */
  suggestedDeviceName?: string
  user?: SetupUserView
  device?: SetupDeviceView
}
