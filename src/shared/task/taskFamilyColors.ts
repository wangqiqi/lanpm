import { LANPM_ACCENT } from '../design/lanpmDesignTokens.ts'
import { BOARD_FAMILY_COUNT } from './boardRelations.ts'

/** 看板 / 任务树 / 甘特 共用任务族色（与 `taskFamily.module.css` 一致） */
export const TASK_FAMILY_COLORS: readonly string[] = [
  LANPM_ACCENT.light,
  '#5856d6',
  '#34c759',
  '#ff9500',
  '#ff2d55',
  '#00c7be',
  '#af52de',
  '#8e8e93'
] as const

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
