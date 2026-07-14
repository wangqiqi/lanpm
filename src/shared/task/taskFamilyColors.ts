import { LANPM_TASK_FAMILY } from '../design/lanpmDesignTokens.ts'
import { BOARD_FAMILY_COUNT } from './boardRelations.ts'

/** 看板 / 任务树 / 甘特 共用任务族色（与 `taskFamily.module.css` · `--lanpm-task-family-*` 一致） */
export const TASK_FAMILY_COLORS: readonly string[] = [...LANPM_TASK_FAMILY] as const

export function taskFamilyBarColors(familyIndex: number): {
  backgroundColor: string
  backgroundSelectedColor: string
  progressColor: string
  progressSelectedColor: string
} | undefined {
  if (familyIndex < 0 || familyIndex >= BOARD_FAMILY_COUNT) return undefined
  const base = TASK_FAMILY_COLORS[familyIndex]!
  return {
    backgroundColor: base,
    backgroundSelectedColor: base,
    progressColor: base,
    progressSelectedColor: base
  }
}
