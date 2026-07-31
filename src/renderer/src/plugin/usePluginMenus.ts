import { useCallback, useEffect, useMemo, useState } from 'react'
import type { MenuProps } from 'antd'
import type { ListedMenuItem, PluginMenuLocation } from '@shared/plugin/menus'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/types'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'
import { applyCommandAction } from '@renderer/plugin/commandEffects'

export function usePluginMenus(location: PluginMenuLocation): MenuProps['items'] {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const [listed, setListed] = useState<ListedMenuItem[]>([])

  const loadMenus = useCallback(async (): Promise<void> => {
    try {
      const all = await getLanpmApi().plugin.listMenus()
      setListed(all.filter((item) => item.location === location))
    } catch {
      setListed([])
    }
  }, [location])

  useEffect(() => {
    void loadMenus()
  }, [loadMenus])

  useEffect(() => {
    const onEnabled = (): void => {
      void loadMenus()
    }
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onEnabled)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onEnabled)
  }, [loadMenus])

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

  return useMemo(
    () =>
      listed.map((item) => ({
        key: `plugin-menu:${item.commandId}`,
        label: t(item.titleKey as MessageKey),
        onClick: () => {
          void runMenuCommand(item.commandId)
        }
      })),
    [listed, runMenuCommand, t]
  )
}
