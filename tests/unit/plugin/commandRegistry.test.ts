import { describe, expect, it } from 'vitest'
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

  it('invoke stub returns ok for core and colon ids', () => {
    expect(invokeListedCommand('core:open-profile').ok).toBe(true)
    expect(invokeListedCommand('lanpm.example:hello').ok).toBe(true)
    expect(invokeListedCommand('missing').ok).toBe(false)
  })
})
