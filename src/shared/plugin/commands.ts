/** 插件 / 核心命令面板条目（§command-palette） */

export type PluginCommand = {
  /** 插件内唯一 id，如 `hello`；扁平化后为 `pluginId:id` 或 `core:id` */
  id: string
  /** i18n key */
  titleKey: string
}

export type ListedCommandSource = 'core' | 'plugin'

export type ListedCommand = {
  /** 全局唯一：`core:<id>` 或 `<pluginId>:<id>` */
  commandId: string
  titleKey: string
  source: ListedCommandSource
  pluginId: string | null
  enabled: boolean
}

/** Core 命令 invoke 后由 renderer 消费的 UI action */
export type OpenProfileCommandAction = {
  type: 'open-profile'
  tab?: string
}

/** 插件命令 invoke 后由 renderer builtin handler registry 执行 */
export type PluginCommandAction = {
  type: 'plugin-command'
  pluginId: string
  commandKey: string
}

export type CommandAction = OpenProfileCommandAction | PluginCommandAction

export type InvokeCommandResult = {
  ok: boolean
  commandId: string
  message?: string
  /** 成功时携带；renderer `applyCommandAction` 消费 */
  action?: CommandAction
}

const CORE_COMMAND_ACTIONS: Record<string, CommandAction> = {
  'core:open-profile': { type: 'open-profile' },
  'core:open-nav-preferences': { type: 'open-profile', tab: 'nav' },
  'core:open-plugins': { type: 'open-profile', tab: 'plugins' }
}

/** 将 listed commandId 解析为 renderer 可执行的 action（core + 已列出 plugin） */
export function resolveCommandAction(
  commandId: string,
  listedPluginCommands: ListedCommand[]
): CommandAction | null {
  const core = CORE_COMMAND_ACTIONS[commandId]
  if (core) return core

  const pluginCmd = listedPluginCommands.find((c) => c.commandId === commandId)
  if (!pluginCmd?.pluginId) return null

  const colon = commandId.indexOf(':')
  const commandKey = colon >= 0 ? commandId.slice(colon + 1) : commandId
  return {
    type: 'plugin-command',
    pluginId: pluginCmd.pluginId,
    commandKey
  }
}
