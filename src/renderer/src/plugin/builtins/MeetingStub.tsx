import { Button, List, Typography, message } from 'antd'
import { AudioOutlined, DesktopOutlined, LoginOutlined, LogoutOutlined } from '@ant-design/icons'
import type { PluginView } from '@shared/plugin/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { useMeetingMesh } from './useMeetingMesh'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
}

/** Lite mesh POC — SyncEnvelope 信令 + 原生 RTCPeerConnection 1v1 */
export default function MeetingStub({ plugin, groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const {
    roomState,
    joined,
    busy,
    meshStatus,
    desktopSources,
    joinRoom,
    leaveRoom,
    loadDesktopSources
  } = useMeetingMesh(plugin, groupId)

  const participants = roomState?.participants ?? []

  const onJoin = async (): Promise<void> => {
    try {
      await joinRoom()
      message.success(t('plugin.meetingJoinOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onLeave = async (): Promise<void> => {
    try {
      await leaveRoom()
      message.info(t('plugin.meetingLeaveOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onDesktop = async (): Promise<void> => {
    try {
      const count = await loadDesktopSources()
      message.success(t('plugin.meetingDesktopOk', { count }))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
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
          {t('plugin.meetingRoomState', {
            phase: roomState.phase ?? 'idle',
            count: participants.length,
            max: roomState.maxParticipants ?? 4
          })}
        </Text>
      ) : null}
      {joined ? (
        <Text type="secondary" className={styles.meetingState}>
          {t('plugin.meetingMeshStatus', { status: meshStatus })}
        </Text>
      ) : null}
      {participants.length > 0 ? (
        <List
          size="small"
          className={styles.meetingParticipants}
          dataSource={participants}
          renderItem={(p) => (
            <List.Item>
              <Text>{p.displayName}</Text>
            </List.Item>
          )}
        />
      ) : null}
      {desktopSources.length > 0 ? (
        <Text type="secondary" className={styles.meetingState}>
          {t('plugin.meetingDesktopCount', { count: desktopSources.length })}
        </Text>
      ) : null}
      <div className={styles.meetingActions}>
        {!joined ? (
          <Button
            size="small"
            type="primary"
            icon={<LoginOutlined />}
            loading={busy}
            onClick={() => void onJoin()}
          >
            {t('plugin.meetingJoin')}
          </Button>
        ) : (
          <Button
            size="small"
            danger
            icon={<LogoutOutlined />}
            loading={busy}
            onClick={() => void onLeave()}
          >
            {t('plugin.meetingLeave')}
          </Button>
        )}
        <Button size="small" icon={<AudioOutlined />} disabled={!joined}>
          {t('plugin.meetingVoiceStub')}
        </Button>
        <Button
          size="small"
          icon={<DesktopOutlined />}
          loading={busy}
          onClick={() => void onDesktop()}
        >
          {t('plugin.meetingScreenStub')}
        </Button>
      </div>
    </div>
  )
}
