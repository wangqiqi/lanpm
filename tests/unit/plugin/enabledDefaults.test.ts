import { describe, expect, it } from 'vitest'
import {
  BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS,
  defaultPluginEnabled
} from '@shared/plugin/enabledDefaults'

describe('defaultPluginEnabled', () => {
  it('enables builtin whitelist when unset', () => {
    expect(defaultPluginEnabled('lanpm.mindmap')).toBe(true)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.mindmap')).toBe(true)
    expect(defaultPluginEnabled('lanpm.ai-assistant')).toBe(true)
  })

  it('keeps example plugin off by default', () => {
    expect(defaultPluginEnabled('lanpm.example')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.example')).toBe(false)
  })

  it('keeps meeting plugin off by default', () => {
    expect(defaultPluginEnabled('lanpm.meeting')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.meeting')).toBe(false)
  })

  it('denies unknown plugins by default', () => {
    expect(defaultPluginEnabled('com.thirdparty.evil')).toBe(false)
    expect(defaultPluginEnabled('lanpm.unknown')).toBe(false)
  })
})
