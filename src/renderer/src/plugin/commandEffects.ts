import type { InvokeCommandResult } from '@shared/plugin/commands'
import type { MessageKey } from '@renderer/i18n/types'
import { runPluginCommandHandler } from '@renderer/plugin/commandHandlerRegistry'

export const LANPM_OPEN_PROFILE_EVENT = 'lanpm:open-profile'
export type OpenProfileDetail = { tab?: string }

export type CommandEffectContext = {
  message: {
    info: (content: string) => void
    success: (content: string) => void
    error: (content: string) => void
  }
  t: (key: MessageKey) => string
}

export async function applyCommandAction(
  result: InvokeCommandResult,
  ctx: CommandEffectContext
): Promise<boolean> {
  if (!result.ok || !result.action) {
    return result.ok
  }

  const { action } = result
  if (action.type === 'open-profile') {
    window.dispatchEvent(
      new CustomEvent<OpenProfileDetail>(LANPM_OPEN_PROFILE_EVENT, {
        detail: action.tab ? { tab: action.tab } : {}
      })
    )
    return true
  }

  if (action.type === 'plugin-command') {
    const ran = await runPluginCommandHandler(action.pluginId, action.commandKey, ctx)
    if (!ran) {
      ctx.message.error(ctx.t('command.invokeFailed'))
      return false
    }
    return true
  }

  return true
}
