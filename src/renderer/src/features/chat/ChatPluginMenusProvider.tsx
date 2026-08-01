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

const CHAT_MENU_LOCATIONS: PluginMenuLocation[] = ['chat.message.context']

const ChatPluginMenusContext = createContext<ChatPluginMenusContextValue | null>(null)

export function ChatPluginMenusProvider({
  children
}: {
  children: React.ReactNode
}): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const [itemsByLocation, setItemsByLocation] = useState<
    Map<PluginMenuLocation, MenuProps['items']>
  >(() => new Map())

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

  useEffect(() => {
    let cancelled = false
    void Promise.all(
      CHAT_MENU_LOCATIONS.map(async (location) => {
        const listed = await fetchPluginMenusCached(location)
        return { location, listed }
      })
    ).then((results) => {
      if (cancelled) return
      const map = new Map<PluginMenuLocation, MenuProps['items']>()
      for (const { location, listed } of results) {
        map.set(
          location,
          listed.map((item) => ({
            key: `plugin-menu:${item.commandId}`,
            label: t(item.titleKey as MessageKey),
            onClick: () => {
              void runMenuCommand(item.commandId)
            }
          }))
        )
      }
      setItemsByLocation(map)
    })
    return () => {
      cancelled = true
    }
  }, [runMenuCommand, t])

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
