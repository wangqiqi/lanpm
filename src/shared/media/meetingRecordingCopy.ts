import type { AppLocale } from '../locale/types'

const SAVE_DIALOG_TITLE: Record<AppLocale, string> = {
  'zh-CN': '保存会议录制',
  'en-US': 'Save meeting recording'
}

const SAVE_DIALOG_FILTER_NAME: Record<AppLocale, string> = {
  'zh-CN': 'WebM 视频',
  'en-US': 'WebM Video'
}

export function meetingSaveRecordingDialogTitle(locale: AppLocale): string {
  return SAVE_DIALOG_TITLE[locale] ?? SAVE_DIALOG_TITLE['zh-CN']
}

export function meetingSaveRecordingFilterName(locale: AppLocale): string {
  return SAVE_DIALOG_FILTER_NAME[locale] ?? SAVE_DIALOG_FILTER_NAME['zh-CN']
}
