import { describe, expect, it } from 'vitest'
import { resolveCommandAction } from '../../../src/shared/plugin/commands.ts'
import {
  invokeListedCommand,
  listAllCommands,
  listPluginCommandsFromDiscover
} from '../../../src/main/plugin/commandRegistry.ts'

describe('commandRegistry', () => {
  it('lists core commands always', () => {
    const listed = listAllCommands([])
    expect(listed.some((c) => c.commandId === 'core:open-profile')).toBe(true)
    expect(listed.some((c) => c.commandId === 'core:open-nav-preferences')).toBe(true)
    expect(listed.some((c) => c.commandId === 'core:open-plugins')).toBe(true)
  })

  it('lists enabled plugin commands only', () => {
    const plugins = [
      {
        id: 'lanpm.example',
        enabled: true,
        commands: [{ id: 'hello', titleKey: 'command.example.hello' }]
      },
      {
        id: 'lanpm.off',
        enabled: false,
        commands: [{ id: 'noop', titleKey: 'x' }]
      }
    ]
    const listed = listPluginCommandsFromDiscover(plugins)
    expect(listed).toEqual([
      {
        commandId: 'lanpm.example:hello',
        titleKey: 'command.example.hello',
        source: 'plugin',
        pluginId: 'lanpm.example',
        enabled: true
      }
    ])
  })

  it('invoke returns core actions', () => {
    const profile = invokeListedCommand('core:open-profile', [])
    expect(profile.ok).toBe(true)
    expect(profile.action).toEqual({ type: 'open-profile' })

    const nav = invokeListedCommand('core:open-nav-preferences', [])
    expect(nav.action).toEqual({ type: 'open-profile', tab: 'nav' })

    const plugins = invokeListedCommand('core:open-plugins', [])
    expect(plugins.action).toEqual({ type: 'open-profile', tab: 'plugins' })
  })

  it('invoke returns plugin action for enabled plugin commands', () => {
    const plugins = [
      {
        id: 'lanpm.example',
        enabled: true,
        commands: [{ id: 'hello', titleKey: 'command.example.hello' }]
      }
    ]
    const result = invokeListedCommand('lanpm.example:hello', plugins)
    expect(result.ok).toBe(true)
    expect(result.action).toEqual({
      type: 'plugin-command',
      pluginId: 'lanpm.example',
      commandKey: 'hello'
    })
  })

  it('invoke rejects unknown and disabled plugin commands', () => {
    expect(invokeListedCommand('missing', []).ok).toBe(false)
    expect(
      invokeListedCommand('lanpm.off:noop', [
        {
          id: 'lanpm.off',
          enabled: false,
          commands: [{ id: 'noop', titleKey: 'x' }]
        }
      ]).ok
    ).toBe(false)
  })
})

describe('resolveCommandAction', () => {
  it('resolves plugin commands from listed entries', () => {
    const action = resolveCommandAction('lanpm.example:hello', [
      {
        commandId: 'lanpm.example:hello',
        titleKey: 'command.example.hello',
        source: 'plugin',
        pluginId: 'lanpm.example',
        enabled: true
      }
    ])
    expect(action).toEqual({
      type: 'plugin-command',
      pluginId: 'lanpm.example',
      commandKey: 'hello'
    })
  })
})
