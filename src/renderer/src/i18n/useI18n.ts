import { useCallback } from 'react'
import { translate, type LocaleId, type MessageKey } from '@renderer/i18n/messages'
import { useUiStore } from '@renderer/stores/uiStore'

export function useI18n(): {
  locale: LocaleId
  t: (key: MessageKey) => string
} {
  const locale = useUiStore((s) => s.locale)

  const t = useCallback((key: MessageKey) => translate(locale, key), [locale])

  return { locale, t }
}
