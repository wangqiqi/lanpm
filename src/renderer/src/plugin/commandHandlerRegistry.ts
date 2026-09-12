import type { MessageKey } from '@renderer/i18n/types'

export type PluginCommandHandlerContext = {
  message: {
    info: (content: string) => void
    success: (content: string) => void
    error: (content: string) => void
  }
  t: (key: MessageKey) => string
}

export type PluginCommandHandler = (
  ctx: PluginCommandHandlerContext
) => void | Promise<void>

const REGISTRY: Record<string, PluginCommandHandler> = {}

export async function runPluginCommandHandler(
  pluginId: string,
  commandKey: string,
  ctx: PluginCommandHandlerContext
): Promise<boolean> {
  const handler = REGISTRY[`${pluginId}:${commandKey}`]
  if (!handler) {
    return false
  }
  await handler(ctx)
  return true
}
