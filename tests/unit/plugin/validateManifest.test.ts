import { describe, expect, it } from 'vitest'
import {
  parsePluginManifest,
  pluginDeclaresCapability
} from '@shared/plugin/validateManifest'

describe('parsePluginManifest', () => {
  it('accepts valid free stub', () => {
    const m = parsePluginManifest({
      id: 'lanpm.example',
      name: 'Example',
      version: '0.1.0',
      slots: ['task.detail.section'],
      capabilities: ['task.get'],
      pricing: 'free'
    })
    expect(m?.id).toBe('lanpm.example')
    expect(m?.pricing).toBe('free')
  })

  it('rejects unknown capability or slot', () => {
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: ['task.detail.section'],
        capabilities: ['task.delete'],
        pricing: 'free'
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: ['magic'],
        capabilities: [],
        pricing: 'paid'
      })
    ).toBeNull()
  })
})

describe('pluginDeclaresCapability', () => {
  it('checks whitelist membership', () => {
    expect(pluginDeclaresCapability({ capabilities: ['task.get'] }, 'task.get')).toBe(true)
    expect(pluginDeclaresCapability({ capabilities: ['task.get'] }, 'task.list')).toBe(false)
  })
})
