import { useCallback } from 'react'
import { translate, type LocaleId, type MessageKey, type TranslateParams } from '@renderer/i18n/messages'
import { useUiStore } from '@renderer/stores/uiStore'

export function useI18n(): {
  locale: LocaleId
  t: (key: MessageKey, params?: TranslateParams) => string
} {
  const locale = useUiStore((s) => s.locale)

  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) => translate(locale, key, params),
    [locale]
  )

  return { locale, t }
}
