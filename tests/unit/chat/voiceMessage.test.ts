import { describe, expect, it } from 'vitest'
import { VOICE_MESSAGE_MAX_MS, formatVoiceDuration } from '@shared/chat/voiceMessage'

describe('voiceMessage', () => {
  it('caps voice at 60s', () => {
    expect(VOICE_MESSAGE_MAX_MS).toBe(60_000)
  })

  it('formatVoiceDuration renders m:ss', () => {
    expect(formatVoiceDuration(0)).toBe('0:00')
    expect(formatVoiceDuration(5_500)).toBe('0:06')
    expect(formatVoiceDuration(65_000)).toBe('1:05')
    expect(formatVoiceDuration(-100)).toBe('0:00')
  })
})
