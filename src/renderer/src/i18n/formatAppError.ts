import { translate, type LocaleId, type MessageKey } from '@renderer/i18n/messages'
import { isLanpmErrorCode } from '@shared/errors/lanpmError'

export function formatAppError(
  err: unknown,
  locale: LocaleId,
  fallback: MessageKey
): string {
  if (err instanceof Error) {
    const msg = err.message.trim()
    if (isLanpmErrorCode(msg)) {
      return translate(locale, msg as MessageKey)
    }
  }
  return translate(locale, fallback)
}
