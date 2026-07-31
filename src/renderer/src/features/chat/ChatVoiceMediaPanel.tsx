import { useEffect, useMemo, useState } from 'react'
import { Button, Typography } from 'antd'
import type { PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import { PluginGroupSlot } from '@renderer/plugin/PluginSlot'
import { resolvePluginComponent } from '@renderer/plugin/registry'
import { PLUGIN_ENABLED_CHANGED_EVENT } from '@renderer/plugin/pluginEvents'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import styles from './chat.module.css'

const { Text } = Typography

interface Props {
  groupId: string
}

/** 聊天语音模式：接 `chat.toolbar.media` Slot；未启用时展示 CTA */
export default function ChatVoiceMediaPanel({ groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const [slotPlugins, setSlotPlugins] = useState<PluginView[]>([])
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    const onChanged = (): void => setReloadToken((n) => n + 1)
    window.addEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
    return () => window.removeEventListener(PLUGIN_ENABLED_CHANGED_EVENT, onChanged)
  }, [])

  useEffect(() => {
    let cancelled = false
    void getLanpmApi()
      .plugin.listSlotPlugins('chat.toolbar.media')
      .then((list) => {
        if (!cancelled) setSlotPlugins(list)
      })
      .catch(() => {
        if (!cancelled) setSlotPlugins([])
      })
    return () => {
      cancelled = true
    }
  }, [groupId, reloadToken])

  const mounted = useMemo(
    () => slotPlugins.filter((p) => p.enabled && resolvePluginComponent(p.id)),
    [slotPlugins]
  )

  if (mounted.length === 0) {
    return (
      <div className={styles.voicePanel} data-testid="chat-voice-media-panel">
        <Text type="secondary" className={styles.voiceHint}>
          {t('plugin.meetingVoiceCta')}
        </Text>
        <Text type="secondary" className={styles.voiceHint}>
          {t('plugin.meetingEnableHint')}
        </Text>
        <Button type="link" size="small" onClick={() => openProfileTab('plugins')}>
          {t('plugin.meetingOpenPlugins')}
        </Button>
      </div>
    )
  }

  return (
    <div className={styles.voicePanel} data-testid="chat-voice-media-panel">
      <PluginGroupSlot slot="chat.toolbar.media" groupId={groupId} view="chat" />
    </div>
  )
}
