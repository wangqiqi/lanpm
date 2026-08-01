import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { app } from 'electron'
import {
  DEFAULT_APP_LOCALE,
  isAppLocale,
  LOCALE_FILE_NAME,
  type AppLocale
} from '../../shared/locale/types.ts'

function localePath(): string {
  return join(app.getPath('userData'), LOCALE_FILE_NAME)
}

export function readAppLocale(): AppLocale {
  const path = localePath()
  if (!existsSync(path)) return DEFAULT_APP_LOCALE
  try {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
    if (raw && typeof raw === 'object' && 'locale' in raw && isAppLocale((raw as { locale: unknown }).locale)) {
      return (raw as { locale: AppLocale }).locale
    }
  } catch {
    /* fall through */
  }
  return DEFAULT_APP_LOCALE
}

export function writeAppLocale(locale: AppLocale): AppLocale {
  const path = localePath()
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify({ locale }, null, 2), 'utf8')
  return locale
}
