import { describe, expect, it, vi } from 'vitest'
import {
  CHAT_PUBLISH_MAX_ATTEMPTS,
  chatPublishBackoffMs,
  runWithPublishRetries
} from '@shared/chat/publishRetry'

describe('chatPublishBackoffMs', () => {
  it('first attempt is immediate', () => {
    expect(chatPublishBackoffMs(0)).toBe(0)
  })

  it('grows then caps at 1000', () => {
    expect(chatPublishBackoffMs(1)).toBe(100)
    expect(chatPublishBackoffMs(2)).toBe(200)
    expect(chatPublishBackoffMs(10)).toBe(1000)
  })
})

describe('runWithPublishRetries', () => {
  it('succeeds on first try without sleep', async () => {
    const sleep = vi.fn(async () => undefined)
    const publish = vi.fn(async () => undefined)
    await runWithPublishRetries(publish, { sleep })
    expect(publish).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it('retries until success', async () => {
    const sleep = vi.fn(async () => undefined)
    const publish = vi
      .fn()
      .mockRejectedValueOnce(new Error('net'))
      .mockResolvedValueOnce(undefined)
    await runWithPublishRetries(publish, { sleep, maxAttempts: 3 })
    expect(publish).toHaveBeenCalledTimes(2)
    expect(sleep).toHaveBeenCalledWith(100)
  })

  it('throws after max attempts', async () => {
    const sleep = vi.fn(async () => undefined)
    const publish = vi.fn(async () => {
      throw new Error('down')
    })
    await expect(runWithPublishRetries(publish, { sleep, maxAttempts: 2 })).rejects.toThrow(
      'down'
    )
    expect(publish).toHaveBeenCalledTimes(2)
    expect(CHAT_PUBLISH_MAX_ATTEMPTS).toBe(3)
  })
})
