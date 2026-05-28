/** Local user profile — docs/04 §3.1 UserProfile */
export interface UserProfile {
  userId: string
  displayName: string
  baseName: string
  suffix?: string
  department?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

/** Local device — docs/04 §3.1 LocalDevice */
export interface LocalDevice {
  deviceId: string
  deviceName: string
  userId: string
  lastSeenAt: string
}
