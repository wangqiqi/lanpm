import type { MessageDeliveryStatus } from '../chat/types'

/** createTaskFromChat：聊天侧失败时需回滚刚创建的任务，保持消息/任务一致。 */
export function shouldCompensateCreateTaskFromChat(
  outcome: { kind: 'thrown' } | { kind: 'message'; deliveryStatus: MessageDeliveryStatus }
): boolean {
  if (outcome.kind === 'thrown') return true
  return outcome.deliveryStatus === 'failed'
}
