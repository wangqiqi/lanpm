/** Official plugins shipped under `plugins/` — enabled when user has no preference yet. */
export const BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS: ReadonlySet<string> = new Set([
  'lanpm.ai-assistant',
  'lanpm.mindmap',
  'lanpm.backup'
])

/** Unconfigured plugins default to deny, except builtin whitelist (TASK-324). */
export function defaultPluginEnabled(pluginId: string): boolean {
  return BUILTIN_DEFAULT_ENABLED_PLUGIN_IDS.has(pluginId)
}
