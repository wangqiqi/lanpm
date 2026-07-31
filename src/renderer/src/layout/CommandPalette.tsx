import { useCallback, useEffect, useMemo, useState } from 'react'
import { Input, List, Modal, Typography } from 'antd'
import type { ListedCommand } from '@shared/plugin/commands'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useI18n } from '@renderer/i18n/useI18n'
import type { MessageKey } from '@renderer/i18n/types'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'
import styles from './CommandPalette.module.css'

const { Text } = Typography

export const LANPM_OPEN_PROFILE_EVENT = 'lanpm:open-profile'
export type OpenProfileDetail = { tab?: string }

function isPaletteHotkey(event: KeyboardEvent): boolean {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k'
}

export default function CommandPalette(): React.ReactElement {
  const { t } = useI18n()
  const { message } = useLanpmApp()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [commands, setCommands] = useState<ListedCommand[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [busy, setBusy] = useState(false)

  const loadCommands = useCallback(async (): Promise<void> => {
    try {
      const listed = await getLanpmApi().plugin.listCommands()
      setCommands(listed)
    } catch {
      setCommands([])
    }
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (!isPaletteHotkey(event)) return
      event.preventDefault()
      setOpen((prev) => !prev)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActiveIndex(0)
    void loadCommands()
  }, [open, loadCommands])

  useEffect(() => {
    const onEnabled = (): void => {
      if (open) void loadCommands()
    }
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onEnabled)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onEnabled)
  }, [open, loadCommands])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((cmd) => {
      const title = t(cmd.titleKey as MessageKey).toLowerCase()
      return title.includes(q) || cmd.commandId.toLowerCase().includes(q)
    })
  }, [commands, query, t])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  const runCommand = async (cmd: ListedCommand): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      if (cmd.commandId === 'core:open-profile') {
        window.dispatchEvent(
          new CustomEvent<OpenProfileDetail>(LANPM_OPEN_PROFILE_EVENT, { detail: {} })
        )
      } else if (cmd.commandId === 'core:open-nav-preferences') {
        window.dispatchEvent(
          new CustomEvent<OpenProfileDetail>(LANPM_OPEN_PROFILE_EVENT, {
            detail: { tab: 'nav' }
          })
        )
      } else if (cmd.commandId === 'core:open-plugins') {
        window.dispatchEvent(
          new CustomEvent<OpenProfileDetail>(LANPM_OPEN_PROFILE_EVENT, {
            detail: { tab: 'plugins' }
          })
        )
      }
      const result = await getLanpmApi().plugin.invokeCommand(cmd.commandId)
      if (result.ok) {
        message.success(t('command.invokeOk', { name: t(cmd.titleKey as MessageKey) }))
      } else {
        message.error(t('command.invokeFailed'))
      }
      setOpen(false)
    } catch {
      message.error(t('command.invokeFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onCancel={() => setOpen(false)}
      footer={null}
      title={t('command.paletteTitle')}
      destroyOnHidden
      className={styles.modal}
      width={520}
    >
      <Text type="secondary" className={styles.hint}>
        {t('command.paletteHint')}
      </Text>
      <Input
        autoFocus
        allowClear
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('command.palettePlaceholder')}
        aria-label={t('command.palettePlaceholder')}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault()
            setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
          } else if (event.key === 'ArrowUp') {
            event.preventDefault()
            setActiveIndex((i) => Math.max(i - 1, 0))
          } else if (event.key === 'Enter') {
            const cmd = filtered[activeIndex]
            if (cmd) {
              event.preventDefault()
              void runCommand(cmd)
            }
          }
        }}
      />
      <List
        className={styles.list}
        dataSource={filtered}
        locale={{ emptyText: t('command.paletteEmpty') }}
        renderItem={(cmd, index) => (
          <List.Item
            className={`${styles.item} ${index === activeIndex ? styles.itemActive : ''}`}
            onMouseEnter={() => setActiveIndex(index)}
            onClick={() => void runCommand(cmd)}
          >
            <span className={styles.itemTitle}>{t(cmd.titleKey as MessageKey)}</span>
            <span className={styles.itemMeta}>
              {cmd.source === 'core' ? t('command.sourceCore') : cmd.pluginId}
            </span>
          </List.Item>
        )}
      />
    </Modal>
  )
}
