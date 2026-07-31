import { useEffect, useState } from 'react'
import { Button, Typography, message } from 'antd'
import { AudioOutlined, DesktopOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { PluginView } from '@shared/plugin/types'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
}

type RoomState = {
  stub?: boolean
  phase?: string
  participants?: string[]
}

/** 可购会议插件 stub — Lite mesh / 投屏能力经 Host 代理（无真实 WebRTC） */
export default function MeetingStub({ plugin, groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getLanpmApi()
      .plugin.invokeCapability(plugin.id, 'media.room.state', { groupId })
      .then((raw) => {
        if (!cancelled) setRoomState(raw as RoomState)
      })
      .catch(() => {
        if (!cancelled) setRoomState(null)
      })
    return () => {
      cancelled = true
    }
  }, [plugin.id, groupId])

  const runStub = async (cap: 'media.signal.send' | 'media.captureDesktop'): Promise<void> => {
    setBusy(true)
    try {
      const result = await getLanpmApi().plugin.invokeCapability(plugin.id, cap, {
        groupId,
        envelopeId: `meeting-stub-${Date.now()}`
      })
      message.info(t('plugin.meetingStubOk', { cap }))
      void result
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.card} data-plugin-id={plugin.id}>
      <div className={styles.cardHeader}>
        <Text strong>{plugin.name}</Text>
        <span className={styles.badge}>{t('plugin.pricingPaid')}</span>
      </div>
      <Text type="secondary">{t('plugin.meetingStubHint')}</Text>
      {roomState ? (
        <Text type="secondary" className={styles.meetingState}>
          {t('plugin.meetingRoomState', { phase: roomState.phase ?? 'idle' })}
        </Text>
      ) : null}
      <div className={styles.meetingActions}>
        <Button
          size="small"
          icon={<AudioOutlined />}
          loading={busy}
          onClick={() => void runStub('media.signal.send')}
        >
          {t('plugin.meetingVoiceStub')}
        </Button>
        <Button
          size="small"
          icon={<VideoCameraOutlined />}
          loading={busy}
          onClick={() => void runStub('media.signal.send')}
        >
          {t('plugin.meetingVideoStub')}
        </Button>
        <Button
          size="small"
          icon={<DesktopOutlined />}
          loading={busy}
          onClick={() => void runStub('media.captureDesktop')}
        >
          {t('plugin.meetingScreenStub')}
        </Button>
      </div>
    </div>
  )
}
