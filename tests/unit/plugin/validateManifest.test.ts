import { describe, expect, it } from 'vitest'
import {
  defaultContributionGroupTypes,
  isReservedContributionRoute
} from '@shared/plugin/contributions'
import {
  parsePluginManifest,
  pluginDeclaresCapability,
  resolveContributionGroupTypes
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

  it('accepts menus[] referencing declared commands', () => {
    const m = parsePluginManifest({
      id: 'lanpm.menu',
      name: 'Menu',
      version: '0.1.0',
      slots: [],
      capabilities: [],
      pricing: 'free',
      commands: [{ id: 'hello', titleKey: 'command.example.hello' }],
      menus: [
        {
          location: 'topbar.user',
          items: [{ command: 'hello' }]
        }
      ]
    })
    expect(m?.menus).toEqual([
      {
        location: 'topbar.user',
        items: [{ command: 'hello' }]
      }
    ])
  })

  it('rejects menus with unknown command or invalid location', () => {
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        commands: [{ id: 'hello', titleKey: 'a' }],
        menus: [{ location: 'topbar.user', items: [{ command: 'missing' }] }]
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        commands: [{ id: 'hello', titleKey: 'a' }],
        menus: [{ location: 'magic.menu', items: [{ command: 'hello' }] }]
      })
    ).toBeNull()
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
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: ['task.detail.section'],
        capabilities: [],
        pricing: 'free',
        commands: 'nope'
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
        commands: [{ id: '', titleKey: 'a' }]
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
        commands: [{ id: 'ok', titleKey: '  ' }]
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
        commands: [null]
      })
    ).toBeNull()
  })

  it('rejects empty slots without contributions or commands', () => {
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free'
      })
    ).toBeNull()
  })

  it('accepts contributions.views with icon, groupTypes, pricing, engines', () => {
    const m = parsePluginManifest({
      id: 'lanpm.mindmap',
      name: 'Mind Map',
      version: '0.1.0',
      slots: ['mindmap.toolbar'],
      capabilities: ['task.list'],
      pricing: 'paid',
      engines: { lanpm: '>=1.74.0' },
      contributions: {
        views: [
          {
            id: 'mindmap',
            route: 'mindmap',
            titleKey: 'nav.mindmap',
            icon: 'apartment',
            groupTypes: ['project', 'function'],
            pricing: 'paid'
          }
        ]
      }
    })
    expect(m?.engines).toEqual({ lanpm: '>=1.74.0' })
    expect(m?.contributions?.views).toEqual([
      {
        id: 'mindmap',
        route: 'mindmap',
        titleKey: 'nav.mindmap',
        icon: 'apartment',
        groupTypes: ['project', 'function'],
        pricing: 'paid'
      }
    ])
  })

  it('allows empty slots when contributions.views present', () => {
    const m = parsePluginManifest({
      id: 'lanpm.view-only',
      name: 'View',
      version: '0.1.0',
      slots: [],
      capabilities: [],
      pricing: 'free',
      contributions: {
        views: [{ id: 'x', route: 'custom-view', titleKey: 'nav.x' }]
      }
    })
    expect(m?.contributions?.views?.[0]?.route).toBe('custom-view')
  })

  it('rejects reserved or invalid contribution routes', () => {
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        contributions: {
          views: [{ id: 'a', route: 'chat', titleKey: 't' }]
        }
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        contributions: {
          views: [{ id: 'a', route: 'Bad', titleKey: 't' }]
        }
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        contributions: {
          views: [
            { id: 'a', route: 'dup', titleKey: 't' },
            { id: 'b', route: 'dup', titleKey: 't2' }
          ]
        }
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        contributions: { views: 'nope' }
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        contributions: {
          views: [{ id: 'a', route: 'ok', titleKey: 't', groupTypes: [] }]
        }
      })
    ).toBeNull()
    expect(
      parsePluginManifest({
        id: 'x',
        name: 'x',
        version: '1',
        slots: [],
        capabilities: [],
        pricing: 'free',
        contributions: {
          views: [{ id: 'a', route: 'ok', titleKey: 't', groupTypes: ['space'] }]
        }
      })
    ).toBeNull()
  })

  it('rejects non-object root and missing required fields', () => {
    expect(parsePluginManifest(null)).toBeNull()
    expect(parsePluginManifest('x')).toBeNull()
    expect(
      parsePluginManifest({
        name: 'x',
        version: '1',
        slots: ['task.detail.section'],
        capabilities: [],
        pricing: 'free'
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

describe('contribution helpers', () => {
  it('detects reserved routes and defaults group types', () => {
    expect(isReservedContributionRoute('board')).toBe(true)
    expect(isReservedContributionRoute('mindmap')).toBe(false)
    expect(defaultContributionGroupTypes()).toEqual(['project'])
    expect(
      resolveContributionGroupTypes({
        id: 'a',
        route: 'mindmap',
        titleKey: 't',
        groupTypes: ['function']
      })
    ).toEqual(['function'])
    expect(
      resolveContributionGroupTypes({ id: 'a', route: 'mindmap', titleKey: 't' })
    ).toEqual(['project'])
  })
})
