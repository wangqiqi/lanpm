import type { AiPromptPresetId } from '@shared/ai/promptPresets'
import { listAiPromptPresets } from '@shared/ai/promptPresets'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/types'
import styles from './aiAssistant.module.css'

const PROMPT_LABEL_KEYS: Record<AiPromptPresetId, MessageKey> = {
  projectReview: 'ai.prompt.projectReview.label',
  overdueTasks: 'ai.prompt.overdueTasks.label',
  weekSummary: 'ai.prompt.weekSummary.label',
  taskRisk: 'ai.prompt.taskRisk.label',
  splitSubtasks: 'ai.prompt.splitSubtasks.label',
  patrolFollowUp: 'ai.prompt.patrolFollowUp.label',
  globalHelp: 'ai.prompt.globalHelp.label'
}

const PROMPT_MESSAGE_KEYS: Record<AiPromptPresetId, MessageKey> = {
  projectReview: 'ai.prompt.projectReview.message',
  overdueTasks: 'ai.prompt.overdueTasks.message',
  weekSummary: 'ai.prompt.weekSummary.message',
  taskRisk: 'ai.prompt.taskRisk.message',
  splitSubtasks: 'ai.prompt.splitSubtasks.message',
  patrolFollowUp: 'ai.prompt.patrolFollowUp.message',
  globalHelp: 'ai.prompt.globalHelp.message'
}

interface AiPromptRailProps {
  hasGroup: boolean
  layout: 'rail' | 'chips'
  disabled?: boolean
  onSendPreset: (message: string) => void
}

export default function AiPromptRail({
  hasGroup,
  layout,
  disabled,
  onSendPreset
}: AiPromptRailProps): React.ReactElement {
  const { t } = useI18n()
  const presets = listAiPromptPresets(hasGroup)

  const buttons = presets.map((preset) => (
    <button
      key={preset.id}
      type="button"
      className={layout === 'rail' ? styles.promptRailItem : styles.promptChip}
      disabled={disabled}
      onClick={() => onSendPreset(t(PROMPT_MESSAGE_KEYS[preset.id]))}
    >
      {t(PROMPT_LABEL_KEYS[preset.id])}
    </button>
  ))

  if (layout === 'chips') {
    return (
      <div className={styles.promptChipsWrap}>
        <span className={styles.promptChipsTitle}>{t('ai.promptsTitle')}</span>
        <div className={styles.promptChips}>{buttons}</div>
      </div>
    )
  }

  return (
    <aside className={styles.promptRail} aria-label={t('ai.promptsTitle')}>
      <div className={styles.promptRailTitle}>{t('ai.promptsTitle')}</div>
      <div className={styles.promptRailList}>{buttons}</div>
    </aside>
  )
}
