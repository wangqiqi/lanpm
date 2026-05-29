import type { MessageKey } from '@renderer/i18n/messages'
import type { TaskValidationKey } from '@shared/task/validation'
import {
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_OTHER_REASON_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH
} from '@shared/task/validation'

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string

export function taskValidationMessage(t: Translate, key: TaskValidationKey): string {
  switch (key) {
    case 'task.titleTooLong':
      return t(key, { max: TASK_TITLE_MAX_LENGTH })
    case 'task.otherReasonTooLong':
      return t(key, { max: TASK_OTHER_REASON_MAX_LENGTH })
    default:
      return t(key)
  }
}

export {
  TASK_DESCRIPTION_MAX_LENGTH,
  TASK_OTHER_REASON_MAX_LENGTH,
  TASK_TITLE_MAX_LENGTH
}
