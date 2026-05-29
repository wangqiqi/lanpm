import { LANPM_GUEST_DISPLAY } from '@shared/constants/display'
import type { MessageKey } from '@renderer/i18n/messages'

export function resolveMemberDisplayName(
  storedName: string,
  t: (key: MessageKey, params?: Record<string, string | number>) => string
): string {
  if (storedName === LANPM_GUEST_DISPLAY) {
    return t('member.guest')
  }
  if (storedName.startsWith(`${LANPM_GUEST_DISPLAY}:`)) {
    const n = storedName.slice(LANPM_GUEST_DISPLAY.length + 1)
    return n ? t('member.guestNumber', { n }) : t('member.guest')
  }
  if (storedName === '访客') {
    return t('member.guest')
  }
  if (storedName.startsWith('访客')) {
    const n = storedName.slice(2)
    return n ? t('member.guestNumber', { n }) : t('member.guest')
  }
  return storedName
}
