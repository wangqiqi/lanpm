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
    expect(defaultPluginEnabled('lanpm.backup')).toBe(true)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.backup')).toBe(true)
  })

  it('keeps meeting plugin off by default', () => {
    expect(defaultPluginEnabled('lanpm.meeting')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.meeting')).toBe(false)
    expect(defaultPluginEnabled('lanpm.schedule')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.schedule')).toBe(false)
    expect(defaultPluginEnabled('lanpm.agile')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.agile')).toBe(false)
    expect(defaultPluginEnabled('lanpm.weekly')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.weekly')).toBe(false)
  })

  it('denies unknown plugins by default', () => {
    expect(defaultPluginEnabled('com.thirdparty.evil')).toBe(false)
    expect(defaultPluginEnabled('lanpm.unknown')).toBe(false)
  })
})
