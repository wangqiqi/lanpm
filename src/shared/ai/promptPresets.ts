/** 内置 AI 助手快捷提示词（文案走 i18n `ai.prompt.*`） */

export type AiPromptPresetId =
  | 'projectReview'
  | 'overdueTasks'
  | 'weekSummary'
  | 'taskRisk'
  | 'splitSubtasks'
  | 'patrolFollowUp'
  | 'healthCheck'
  | 'globalHelp'

export interface AiPromptPresetDef {
  id: AiPromptPresetId
  /** 需要绑定群上下文时才展示 */
  requiresGroup: boolean
}

export const AI_PROMPT_PRESETS: readonly AiPromptPresetDef[] = [
  { id: 'projectReview', requiresGroup: true },
  { id: 'overdueTasks', requiresGroup: true },
  { id: 'weekSummary', requiresGroup: true },
  { id: 'taskRisk', requiresGroup: true },
  { id: 'splitSubtasks', requiresGroup: true },
  { id: 'patrolFollowUp', requiresGroup: false },
  { id: 'healthCheck', requiresGroup: true },
  { id: 'globalHelp', requiresGroup: false }
] as const

export function listAiPromptPresets(hasGroup: boolean): AiPromptPresetDef[] {
  return AI_PROMPT_PRESETS.filter((p) => (hasGroup ? true : !p.requiresGroup))
}
