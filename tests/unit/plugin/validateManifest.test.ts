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

  it('accepts meeting manifest with media capabilities', () => {
    const m = parsePluginManifest({
      id: 'lanpm.meeting',
      name: 'Meeting',
      version: '0.1.0',
      slots: ['chat.toolbar.media'],
      capabilities: [
        'media.signal.send',
        'media.signal.poll',
        'media.captureDesktop',
        'media.room.state'
      ],
      pricing: 'paid'
    })
    expect(m?.id).toBe('lanpm.meeting')
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

  it('accepts commands[] and allows empty slots when commands present', () => {
    const m = parsePluginManifest({
      id: 'lanpm.cmd-only',
      name: 'Cmd',
      version: '0.1.0',
      slots: [],
      capabilities: [],
      pricing: 'free',
      commands: [{ id: 'hello', titleKey: 'command.example.hello' }]
    })
    expect(m?.commands).toEqual([{ id: 'hello', titleKey: 'command.example.hello' }])
  })

  it('rejects duplicate or invalid command ids', () => {
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: ['task.detail.section'],
        capabilities: [],
        pricing: 'free',
        commands: [
          { id: 'hello', titleKey: 'a' },
          { id: 'hello', titleKey: 'b' }
        ]
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: ['task.detail.section'],
        capabilities: [],
        pricing: 'free',
        commands: [{ id: 'Bad_Id', titleKey: 'a' }]
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
