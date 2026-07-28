import { describe, expect, it } from 'vitest'
import {
  BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS,
  defaultPluginEnabled
} from '@shared/plugin/enabledDefaults'

describe('defaultPluginEnabled', () => {
  it('enables builtin whitelist when unset', () => {
    expect(defaultPluginEnabled('lanpm.formjs')).toBe(true)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.formjs')).toBe(true)
  })

  it('keeps example plugin off by default', () => {
    expect(defaultPluginEnabled('lanpm.example')).toBe(false)
    expect(BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has('lanpm.example')).toBe(false)
  })

  it('denies unknown plugins by default', () => {
    expect(defaultPluginEnabled('com.thirdparty.evil')).toBe(false)
    expect(defaultPluginEnabled('lanpm.unknown')).toBe(false)
  })
})
