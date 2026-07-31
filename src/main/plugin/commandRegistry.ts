/** Core + plugin command registry for command palette */

import type { InvokeCommandResult, ListedCommand } from '../../shared/plugin/commands.ts'
import { resolveCommandAction } from '../../shared/plugin/commands.ts'

const CORE_COMMANDS: ListedCommand[] = [
  {
    commandId: 'core:open-profile',
    titleKey: 'command.core.openProfile',
    source: 'core',
    pluginId: null,
    enabled: true
  },
  {
    commandId: 'core:open-nav-preferences',
    titleKey: 'command.core.openNavPreferences',
    source: 'core',
    pluginId: null,
    enabled: true
  },
  {
    commandId: 'core:open-plugins',
    titleKey: 'command.core.openPlugins',
    source: 'core',
    pluginId: null,
    enabled: true
  }
]

export function listPluginCommandsFromDiscover(
  plugins: Array<{
    id: string
    enabled: boolean
    commands?: Array<{ id: string; titleKey: string }>
  }>
): ListedCommand[] {
  const listed: ListedCommand[] = []
  for (const plugin of plugins) {
    if (!plugin.enabled) continue
    for (const cmd of plugin.commands ?? []) {
      listed.push({
        commandId: `${plugin.id}:${cmd.id}`,
        titleKey: cmd.titleKey,
        source: 'plugin',
        pluginId: plugin.id,
        enabled: true
      })
    }
  }
  listed.sort((a, b) => a.commandId.localeCompare(b.commandId))
  return listed
}

export function listAllCommands(
  plugins: Array<{
    id: string
    enabled: boolean
    commands?: Array<{ id: string; titleKey: string }>
  }>
): ListedCommand[] {
  return [...CORE_COMMANDS, ...listPluginCommandsFromDiscover(plugins)]
}

export function invokeListedCommand(
  commandId: string,
  plugins: Array<{
    id: string
    enabled: boolean
    commands?: Array<{ id: string; titleKey: string }>
  }>
): InvokeCommandResult {
  const pluginListed = listPluginCommandsFromDiscover(plugins)
  const action = resolveCommandAction(commandId, pluginListed)
  if (!action) {
    return { ok: false, commandId, message: 'unknown command' }
  }
  return { ok: true, commandId, action }
}
