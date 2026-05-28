export interface SetupInput {
  baseName: string
  deviceName: string
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
  user?: SetupUserView
  device?: SetupDeviceView
}
