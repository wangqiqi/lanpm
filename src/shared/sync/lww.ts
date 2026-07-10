/**
 * LWW：先比 updatedAt（ISO 字符串），相等时用 senderDeviceId 字典序决胜（较大者胜）。
 * localDeviceId 为空时，平局一律接受远端（兼容未迁移旧行）。
 */
export function lwwShouldApply(
  remoteUpdatedAt: string,
  localUpdatedAt: string | null | undefined,
  remoteDeviceId: string,
  localDeviceId: string | null | undefined
): boolean {
  if (!localUpdatedAt) return true
  if (remoteUpdatedAt > localUpdatedAt) return true
  if (remoteUpdatedAt < localUpdatedAt) return false
  const local = localDeviceId ?? ''
  if (!local) return true
  return remoteDeviceId > local
}
