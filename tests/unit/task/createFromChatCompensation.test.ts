import { describe, expect, it } from 'vitest'
import { shouldCompensateCreateTaskFromChat } from '../../../src/shared/task/createFromChatCompensation'

describe('shouldCompensateCreateTaskFromChat', () => {
  it('compensates when publish throws', () => {
    expect(shouldCompensateCreateTaskFromChat({ kind: 'thrown' })).toBe(true)
  })

  it('compensates when message delivery failed', () => {
    expect(
      shouldCompensateCreateTaskFromChat({ kind: 'message', deliveryStatus: 'failed' })
    ).toBe(true)
  })

  it('does not compensate when message sent', () => {
    expect(
      shouldCompensateCreateTaskFromChat({ kind: 'message', deliveryStatus: 'sent' })
    ).toBe(false)
    expect(
      shouldCompensateCreateTaskFromChat({ kind: 'message', deliveryStatus: 'sending' })
    ).toBe(false)
  })
})
