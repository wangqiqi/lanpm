import { USER_NOTICE_CHANNEL, type UserNotice } from '../../shared/sync/userNotice'
import { broadcastToAllWindows } from './broadcast'

/**
 * 记录同步失败；可选推送用户侧轻提示。
 * 无 transport / 未配置时 publish 早退不抛错，不会走到这里——避免「预期离线」误报。
 */
export function reportSyncFailure(
  scope: string,
  err: unknown,
  opts?: { notify?: boolean; messageKey?: string; level?: UserNotice['level'] }
): void {
  const detail = err instanceof Error ? err.message : String(err)
  console.warn(`[lanpm] ${scope}:`, detail)
  if (opts?.notify === false || !opts?.messageKey) return
  const notice: UserNotice = {
    level: opts.level ?? 'warning',
    messageKey: opts.messageKey
  }
  broadcastToAllWindows(USER_NOTICE_CHANNEL, notice)
}

export function catchSyncFailure(
  scope: string,
  opts?: { notify?: boolean; messageKey?: string; level?: UserNotice['level'] }
): (err: unknown) => void {
  return (err) => reportSyncFailure(scope, err, opts)
}
