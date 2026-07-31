/** 插件 / 核心命令面板条目（§command-palette POC） */

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

export type InvokeCommandResult = {
  ok: boolean
  commandId: string
  message?: string
}
