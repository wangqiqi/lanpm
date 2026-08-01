import { describe, expect, it } from 'vitest'
import { resolveMenuCommandId } from '../../../src/shared/plugin/menus.ts'
import {
  listAllMenus,
  listPluginMenusFromDiscover
} from '../../../src/main/plugin/menuRegistry.ts'

describe('resolveMenuCommandId', () => {
  it('prefixes plugin id for local command refs', () => {
    expect(resolveMenuCommandId('lanpm.example', 'hello')).toBe('lanpm.example:hello')
  })

  it('passes through fully qualified command ids', () => {
    expect(resolveMenuCommandId('lanpm.example', 'lanpm.other:noop')).toBe('lanpm.other:noop')
  })
})

describe('menuRegistry', () => {
  it('lists enabled plugin menu items with command title keys', () => {
    const plugins = [
      {
        id: 'lanpm.example',
        enabled: true,
        commands: [{ id: 'hello', titleKey: 'command.example.hello' }],
        menus: [
          {
            location: 'topbar.user' as const,
            items: [{ command: 'hello' }]
          }
        ]
      },
      {
        id: 'lanpm.off',
        enabled: false,
        commands: [{ id: 'noop', titleKey: 'x' }],
        menus: [
          {
            location: 'topbar.user' as const,
            items: [{ command: 'noop' }]
          }
        ]
      }
    ]
    const listed = listPluginMenusFromDiscover(plugins)
    expect(listed).toEqual([
      {
        location: 'topbar.user',
        commandId: 'lanpm.example:hello',
        titleKey: 'command.example.hello',
        source: 'plugin',
        pluginId: 'lanpm.example',
        enabled: true
      }
    ])
    expect(listAllMenus(plugins)).toEqual(listed)
  })

  it('filters menus by location when provided', () => {
    const plugins = [
      {
        id: 'lanpm.example',
        enabled: true,
        commands: [
          { id: 'hello', titleKey: 'command.example.hello' },
          { id: 'ctx', titleKey: 'command.example.ctx' }
        ],
        menus: [
          {
            location: 'topbar.user' as const,
            items: [{ command: 'hello' }]
          },
          {
            location: 'chat.message.context' as const,
            items: [{ command: 'ctx' }]
          }
        ]
      }
    ]
    expect(listAllMenus(plugins, 'chat.message.context')).toEqual([
      {
        location: 'chat.message.context',
        commandId: 'lanpm.example:ctx',
        titleKey: 'command.example.ctx',
        source: 'plugin',
        pluginId: 'lanpm.example',
        enabled: true
      }
    ])
  })
})
