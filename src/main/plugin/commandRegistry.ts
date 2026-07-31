/** Core + plugin command registry for command palette POC */

import type { InvokeCommandResult, ListedCommand } from '../../shared/plugin/commands.ts'

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

export function invokeListedCommand(commandId: string): InvokeCommandResult {
  const all = [...CORE_COMMANDS]
  const known = all.find((c) => c.commandId === commandId)
  if (known) {
    return { ok: true, commandId, message: 'core stub' }
  }
  if (commandId.includes(':')) {
    return { ok: true, commandId, message: 'plugin stub' }
  }
  return { ok: false, commandId, message: 'unknown command' }
}
