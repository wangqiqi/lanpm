import { useCallback } from 'react'
import { formatAppError } from '@renderer/i18n/formatAppError'
import { translate, type LocaleId, type MessageKey, type TranslateParams } from '@renderer/i18n/messages'
import { useUiStore } from '@renderer/stores/uiStore'

export function useI18n(): {
  locale: LocaleId
  t: (key: MessageKey, params?: TranslateParams) => string
  formatError: (err: unknown, fallback: MessageKey) => string
} {
  const locale = useUiStore((s) => s.locale)

  const t = useCallback(
    (key: MessageKey, params?: TranslateParams) => translate(locale, key, params),
    [locale]
  )

  const formatError = useCallback(
    (err: unknown, fallback: MessageKey) => formatAppError(err, locale, fallback),
    [locale]
  )

  return { locale, t, formatError }
}
