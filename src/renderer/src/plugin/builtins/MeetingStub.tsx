import { Button, Divider, List, Typography, message } from 'antd'
import { AudioOutlined, DesktopOutlined, LoginOutlined, LogoutOutlined, VideoCameraOutlined } from '@ant-design/icons'
import type { PluginView } from '@shared/plugin/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { useMeetingMesh } from './useMeetingMesh'
import { useMeetingLiveKit } from './useMeetingLiveKit'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
}

/** Lite mesh POC + Pro LiveKit 旁路 */
export default function MeetingStub({ plugin, groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const {
    roomState,
    joined,
    busy: meshBusy,
    meshStatus,
    desktopSources,
    joinRoom,
    leaveRoom,
    loadDesktopSources
  } = useMeetingMesh(plugin, groupId)

  const {
    configured: liveKitConfigured,
    proStatus,
    proJoined,
    busy: proBusy,
    muted,
    sdkMissing,
    joinProRoom,
    leaveProRoom,
    toggleProMute
  } = useMeetingLiveKit(plugin, groupId)

  const participants = roomState?.participants ?? []
  const busy = meshBusy || proBusy

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

  const onProJoin = async (): Promise<void> => {
    try {
      await joinProRoom()
      message.success(t('plugin.meetingProJoinOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onProLeave = async (): Promise<void> => {
    try {
      await leaveProRoom()
      message.info(t('plugin.meetingProLeaveOk'))
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

      <Divider orientation="left" plain>
        {t('plugin.meetingLiteSection')}
      </Divider>
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
            disabled={proJoined}
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

      <Divider orientation="left" plain>
        {t('plugin.meetingProSection')}
      </Divider>
      {!liveKitConfigured ? (
        <Text type="secondary">{t('plugin.meetingProConfigureHint')}</Text>
      ) : sdkMissing ? (
        <Text type="warning">{t('plugin.meetingProSdkMissing')}</Text>
      ) : (
        <Text type="secondary" className={styles.meetingState}>
          {t('plugin.meetingProStatus', { status: proStatus })}
        </Text>
      )}
      <div className={styles.meetingActions}>
        {!proJoined ? (
          <Button
            size="small"
            type="primary"
            icon={<VideoCameraOutlined />}
            loading={busy}
            disabled={!liveKitConfigured || joined}
            onClick={() => void onProJoin()}
          >
            {t('plugin.meetingProJoin')}
          </Button>
        ) : (
          <Button
            size="small"
            danger
            icon={<LogoutOutlined />}
            loading={busy}
            onClick={() => void onProLeave()}
          >
            {t('plugin.meetingProLeave')}
          </Button>
        )}
        <Button
          size="small"
          icon={<AudioOutlined />}
          disabled={!proJoined}
          onClick={() => void toggleProMute()}
        >
          {muted ? t('plugin.meetingProUnmute') : t('plugin.meetingProMute')}
        </Button>
      </div>
    </div>
  )
}
