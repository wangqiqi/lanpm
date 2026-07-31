import type { QuoteKindLabels } from '@shared/chat/replyQuote'
import type { MessageKey } from '@renderer/i18n/types'

/** Localized fallbacks when quote preview has no extractable text. */
export function buildQuoteKindLabels(
  t: (key: MessageKey) => string
): QuoteKindLabels {
  return {
    text: t('chat.previewKindText'),
    code: t('chat.previewKindCode'),
    file: t('chat.previewKindFile'),
    task_ref: t('chat.previewKindTask'),
    system: t('chat.previewKindSystem'),
    recalled: t('chat.recalledPreview')
  }
}
