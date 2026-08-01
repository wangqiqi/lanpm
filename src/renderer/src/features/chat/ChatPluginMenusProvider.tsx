import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { MenuProps } from 'antd'
import type { PluginMenuLocation } from '@shared/plugin/menus'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/types'
import { fetchPluginMenusCached } from '@renderer/plugin/pluginMenusCache'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { applyCommandAction } from '@renderer/plugin/commandEffects'

type ChatPluginMenusContextValue = {
  itemsForLocation: (location: PluginMenuLocation) => MenuProps['items']
}

const ChatPluginMenusContext = createContext<ChatPluginMenusContextValue | null>(null)

export function ChatPluginMenusProvider({
  children
}: {
  children: React.ReactNode
}): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const [listed, setListed] = useState<Awaited<ReturnType<typeof fetchPluginMenusCached>>>([])

  useEffect(() => {
    let cancelled = false
    void fetchPluginMenusCached().then((menus) => {
      if (!cancelled) setListed(menus)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const runMenuCommand = useCallback(
    async (commandId: string): Promise<void> => {
      try {
        const result = await getLanpmApi().plugin.invokeCommand(commandId)
        await applyCommandAction(result, { message, t })
      } catch (err) {
        message.error(err instanceof Error ? err.message : t('command.invokeFailed'))
      }
    },
    [message, t]
  )

  const itemsByLocation = useMemo(() => {
    const map = new Map<PluginMenuLocation, MenuProps['items']>()
    for (const item of listed) {
      const prev = map.get(item.location) ?? []
      map.set(item.location, [
        ...prev,
        {
          key: `plugin-menu:${item.commandId}`,
          label: t(item.titleKey as MessageKey),
          onClick: () => {
            void runMenuCommand(item.commandId)
          }
        }
      ])
    }
    return map
  }, [listed, runMenuCommand, t])

  const value = useMemo<ChatPluginMenusContextValue>(
    () => ({
      itemsForLocation: (location) => itemsByLocation.get(location) ?? []
    }),
    [itemsByLocation]
  )

  return <ChatPluginMenusContext.Provider value={value}>{children}</ChatPluginMenusContext.Provider>
}

export function useChatPluginMenuItems(location: PluginMenuLocation): MenuProps['items'] {
  const ctx = useContext(ChatPluginMenusContext)
  if (!ctx) return []
  return ctx.itemsForLocation(location)
}
