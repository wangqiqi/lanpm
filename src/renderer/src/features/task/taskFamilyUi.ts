import familyStyles from '@renderer/styles/taskFamily.module.css'
import { BOARD_FAMILY_COUNT } from '@shared/task/boardRelations'

const STRIPE_KEYS = [
  'familyStripe0',
  'familyStripe1',
  'familyStripe2',
  'familyStripe3',
  'familyStripe4',
  'familyStripe5',
  'familyStripe6',
  'familyStripe7'
] as const

/** 任务族左边色条 class（看板卡 / 树行） */
export function taskFamilyStripeClass(
  familyIndex: number,
  opts?: { treeNode?: boolean }
): string | undefined {
  if (familyIndex < 0 || familyIndex >= BOARD_FAMILY_COUNT) return undefined
  const stripe = familyStyles[STRIPE_KEYS[familyIndex]!]
  if (!stripe) return undefined
  return opts?.treeNode ? `${stripe} ${familyStyles.nodeFamilyStripe}` : stripe
}
