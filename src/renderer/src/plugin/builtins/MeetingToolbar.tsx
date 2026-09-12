import { useMemo, useState } from 'react'
import {
  Button,
  List,
  Modal,
  Popover,
  Space,
  Tag,
  Typography,
  message
} from 'antd'
import {
  AudioMutedOutlined,
  AudioOutlined,
  CalendarOutlined,
  DesktopOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  VideoCameraOutlined,
  PlayCircleOutlined,
  StopOutlined
} from '@ant-design/icons'
import type { PluginView } from '@shared/plugin/types'
import type { ViewPluginContext } from '@shared/plugin/viewHost'
import { useI18n } from '@renderer/i18n/useI18n'
import ComposerIconButton from '@renderer/ui/ComposerIconButton'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import { useMeetingMesh } from './useMeetingMesh'
import { useMeetingLiveKit } from './useMeetingLiveKit'
import { useMeetingRecording } from './useMeetingRecording'
import MeetingSchedulePanel from './MeetingSchedulePanel'
import MeetingLiveKitVideoGrid from './MeetingLiveKitVideoGrid'
import styles from '../plugin.module.css'

const { Text } = Typography

type MeshStatus = 'idle' | 'connecting' | 'connected' | 'failed'
type ProStatus = 'idle' | 'connecting' | 'connected' | 'failed' | 'unavailable'

function meshStatusKey(status: MeshStatus): `plugin.meetingMesh${'Idle' | 'Connecting' | 'Connected' | 'Failed'}` {
  const map = {
    idle: 'plugin.meetingMeshIdle',
    connecting: 'plugin.meetingMeshConnecting',
    connected: 'plugin.meetingMeshConnected',
    failed: 'plugin.meetingMeshFailed'
  } as const
  return map[status]
}

function proStatusKey(
  status: ProStatus
): `plugin.meetingPro${'Idle' | 'Connecting' | 'Connected' | 'Unavailable' | 'Failed'}` {
  const map = {
    idle: 'plugin.meetingProIdle',
    connecting: 'plugin.meetingProConnecting',
    connected: 'plugin.meetingProConnected',
    unavailable: 'plugin.meetingProUnavailable',
    failed: 'plugin.meetingProFailed'
  } as const
  return map[status]
}

function roomPhaseKey(phase?: string): 'plugin.meetingRoomPhaseIdle' | 'plugin.meetingRoomPhaseActive' {
  return phase === 'active' ? 'plugin.meetingRoomPhaseActive' : 'plugin.meetingRoomPhaseIdle'
}

interface Props {
  plugin: PluginView
  groupId: string
  context?: ViewPluginContext
}

/** 聊天 Composer 工具栏 `chat.toolbar.media` — 紧凑图标 + Popover 详情 */
export default function MeetingToolbar({ plugin, groupId, context }: Props): React.ReactElement | null {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)

  const {
    roomState,
    joined,
    busy: meshBusy,
    meshStatus,
    desktopSources,
    screenSharing: meshScreenSharing,
    remoteStream,
    joinRoom,
    leaveRoom,
    loadDesktopSources,
    shareDesktopSource,
    stopScreenShare
  } = useMeetingMesh(plugin, groupId)

  const {
    configured: liveKitConfigured,
    proStatus,
    proJoined,
    busy: proBusy,
    muted,
    cameraEnabled,
    screenSharing: proScreenSharing,
    proParticipants,
    sdkMissing,
    joinProRoom,
    leaveProRoom,
    toggleProMute,
    toggleProCamera,
    toggleProScreenShare
  } = useMeetingLiveKit(plugin, groupId)

  const participants = roomState?.participants ?? []
  const busy = meshBusy || proBusy
  const controlsDisabled = !licenseActive
  const inMeeting = joined || proJoined

  const {
    phase: recordingPhase,
    elapsedLabel,
    recording,
    saving: recordingSaving,
    startRecording,
    stopAndSave,
    abortRecording
  } = useMeetingRecording(inMeeting && licenseActive)

  const liteStatusLabel = useMemo(() => {
    if (!joined) return t('plugin.meetingStatusIdle')
    return t('plugin.meetingLiteJoined')
  }, [joined, t])

  const meshStatusLabel = useMemo(() => t(meshStatusKey(meshStatus)), [meshStatus, t])

  const proStatusLabel = useMemo(() => {
    if (!liveKitConfigured) return t('plugin.meetingProNotConfigured')
    if (sdkMissing) return t('plugin.meetingProSdkMissing')
    if (proJoined) return t('plugin.meetingStatusProLive')
    return t('plugin.meetingProStatus', { status: t(proStatusKey(proStatus)) })
  }, [liveKitConfigured, proStatus, proJoined, sdkMissing, t])

  const roomPhaseLabel = useMemo(
    () => t(roomPhaseKey(roomState?.phase)),
    [roomState?.phase, t]
  )

  const onJoin = async (): Promise<void> => {
    if (!licenseActive) return
    try {
      await joinRoom()
      message.success(t('plugin.meetingJoinOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const leaveMeetingAll = async (): Promise<void> => {
    if (recordingPhase === 'recording') abortRecording()
    if (proJoined) await leaveProRoom()
    if (joined) await leaveRoom()
  }

  const onLeave = async (): Promise<void> => {
    try {
      await leaveMeetingAll()
      message.info(t('plugin.meetingLeaveOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const [sourceModalOpen, setSourceModalOpen] = useState(false)

  const onPickScreenShare = async (): Promise<void> => {
    try {
      const count = await loadDesktopSources()
      if (count === 0) {
        message.warning(t('plugin.meetingDesktopEmpty'))
        return
      }
      setSourceModalOpen(true)
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onShareSource = async (sourceId: string): Promise<void> => {
    try {
      await shareDesktopSource(sourceId)
      setSourceModalOpen(false)
      message.success(t('plugin.meetingScreenShareStarted'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onProJoin = async (): Promise<void> => {
    if (!licenseActive) return
    try {
      await joinProRoom()
      message.success(t('plugin.meetingProJoinOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onProLeave = async (): Promise<void> => {
    try {
      await leaveMeetingAll()
      message.info(t('plugin.meetingProLeaveOk'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.capabilityFailed'))
    }
  }

  const onScheduleJoin = async (): Promise<void> => {
    if (!licenseActive) return
    if (liveKitConfigured && !sdkMissing) {
      await joinProRoom()
      return
    }
    await joinRoom()
  }

  const onStartRecord = async (): Promise<void> => {
    try {
      await startRecording()
      message.success(t('plugin.meetingRecordStarted'))
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.meetingRecordFailed'))
    }
  }

  const onStopRecord = async (): Promise<void> => {
    try {
      const result = await stopAndSave()
      if (result.saved) {
        message.success(t('plugin.meetingRecordSaved', { path: result.path ?? '' }))
      } else {
        message.info(t('plugin.meetingRecordCancelled'))
      }
    } catch (err) {
      message.warning(err instanceof Error ? err.message : t('plugin.meetingRecordFailed'))
    }
  }

  const statusHeader = (
    <div className={styles.meetingStatusRow}>
      <Tag color={joined ? 'processing' : 'default'}>{liteStatusLabel}</Tag>
      <Tag color={proJoined ? 'success' : liveKitConfigured ? 'default' : 'warning'}>
        {proJoined ? t('plugin.meetingStatusProLive') : proStatusLabel}
      </Tag>
      {recording ? (
        <Tag color="error" data-testid="meeting-recording-timer">
          {t('plugin.meetingRecordTimer', { elapsed: elapsedLabel })}
        </Tag>
      ) : null}
    </div>
  )

  const configLink = !licenseActive ? (
    <div className={styles.meetingToolbarCta}>
      <Text type="secondary">{t('plugin.meetingLicenseCta')}</Text>
      <Button type="link" size="small" onClick={() => openProfileTab('plugins')}>
        {t('plugin.meetingOpenPlugins')}
      </Button>
    </div>
  ) : !liveKitConfigured ? (
    <div className={styles.meetingToolbarCta}>
      <Button type="link" size="small" onClick={() => openProfileTab('meeting')}>
        {t('plugin.meetingOpenMeetingConfig')}
      </Button>
    </div>
  ) : null

  const detailContent = (
    <div className={styles.meetingPopover} data-testid="meeting-detail-panel">
      {statusHeader}
      {configLink}
      <div className={styles.meetingDetailSection}>
        <Text strong className={styles.meetingDetailTitle}>
          {t('plugin.meetingLiteSection')}
        </Text>
        <Text type="secondary" className={styles.meetingDetailHint}>
          {t('plugin.meetingLiteHint')}
        </Text>
        {roomState ? (
          <Text className={styles.meetingDetailMeta}>
            {t('plugin.meetingRoomState', {
              phase: roomPhaseLabel,
              count: participants.length,
              max: roomState.maxParticipants ?? 4
            })}
          </Text>
        ) : null}
        {joined && meshStatus !== 'idle' ? (
          <Text type="secondary" className={styles.meetingDetailMeta}>
            {t('plugin.meetingMeshStatus', { status: meshStatusLabel })}
          </Text>
        ) : null}
        {participants.length > 0 ? (
          <>
            <Text type="secondary" className={styles.meetingDetailSubhead}>
              {t('plugin.meetingParticipantsTitle')}
            </Text>
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
          </>
        ) : null}
      </div>
      <div className={styles.meetingDetailSection}>
        <Text strong className={styles.meetingDetailTitle}>
          {t('plugin.meetingProSection')}
        </Text>
        <Text type="secondary" className={styles.meetingDetailHint}>
          {t('plugin.meetingProHint')}
        </Text>
        {!liveKitConfigured ? (
          <Text type="secondary" className={styles.meetingDetailMeta}>
            {t('plugin.meetingProConfigureHint')}
          </Text>
        ) : null}
        <MeetingLiveKitVideoGrid
          participants={proParticipants}
          joined={proJoined}
          participantsLabel={t('plugin.meetingProParticipants', {
            count: proParticipants.length
          })}
        />
        {!proJoined ? (
          <Text type="secondary" className={styles.meetingDetailMeta}>
            {proStatusLabel}
          </Text>
        ) : null}
      </div>
      <Text type="secondary" className={styles.meetingDetailFootnote}>
        {t('plugin.meetingRecordLocalHint')}
      </Text>
    </div>
  )

  if (context?.zone !== undefined && context.zone !== 'toolbar') return null

  const menuContent = (
    <div className={styles.meetingMenuPopover} data-testid="meeting-toolbar-menu">
      {statusHeader}
      {!licenseActive ? (
        <div className={styles.meetingToolbarCta} data-testid="meeting-license-cta">
          <Text type="secondary">{t('plugin.meetingLicenseCta')}</Text>
          <Button type="link" size="small" onClick={() => openProfileTab('plugins')}>
            {t('plugin.meetingOpenPlugins')}
          </Button>
        </div>
      ) : null}
      <div className={styles.meetingDetailSection}>
        <Text strong className={styles.meetingDetailTitle}>
          {t('plugin.meetingLiteSection')}
        </Text>
        <Space size={6} wrap className={styles.meetingMenuActions}>
          {!joined ? (
            <Button
              size="small"
              type="primary"
              icon={<LoginOutlined />}
              disabled={controlsDisabled || busy || proJoined}
              data-testid="meeting-join"
              onClick={() => void onJoin()}
            >
              {t('plugin.meetingJoin')}
            </Button>
          ) : (
            <Button
              size="small"
              danger
              icon={<LogoutOutlined />}
              disabled={controlsDisabled || busy}
              data-testid="meeting-leave"
              onClick={() => void onLeave()}
            >
              {t('plugin.meetingLeave')}
            </Button>
          )}
          {meshScreenSharing ? (
            <Button size="small" disabled={controlsDisabled || busy} onClick={() => void stopScreenShare()}>
              {t('plugin.meetingScreenShareStop')}
            </Button>
          ) : (
            <Button
              size="small"
              icon={<DesktopOutlined />}
              disabled={controlsDisabled || busy || !joined}
              data-testid="meeting-mesh-screenshare"
              onClick={() => void onPickScreenShare()}
            >
              {t('plugin.meetingScreenStub')}
            </Button>
          )}
        </Space>
      </div>
      <div className={styles.meetingDetailSection}>
        <Text strong className={styles.meetingDetailTitle}>
          {t('plugin.meetingProSection')}
        </Text>
        {!liveKitConfigured ? (
          <div className={styles.meetingToolbarCta} data-testid="meeting-pro-not-configured">
            <Text type="secondary">{t('plugin.meetingProNotConfigured')}</Text>
            <Text type="secondary">{t('plugin.meetingProConfigureHint')}</Text>
            {licenseActive ? (
              <Button type="link" size="small" onClick={() => openProfileTab('meeting')}>
                {t('plugin.meetingOpenMeetingConfig')}
              </Button>
            ) : null}
          </div>
        ) : sdkMissing ? (
          <Text type="secondary" className={styles.meetingDetailMeta}>
            {t('plugin.meetingProSdkMissing')}
          </Text>
        ) : null}
        <Space size={6} wrap className={styles.meetingMenuActions}>
          {!proJoined ? (
            <Button
              size="small"
              type="primary"
              icon={<VideoCameraOutlined />}
              disabled={controlsDisabled || busy || !liveKitConfigured || joined || sdkMissing}
              data-testid="meeting-pro-join"
              onClick={() => void onProJoin()}
            >
              {t('plugin.meetingProJoin')}
            </Button>
          ) : (
            <Button
              size="small"
              danger
              icon={<LogoutOutlined />}
              disabled={controlsDisabled || busy}
              data-testid="meeting-pro-leave"
              onClick={() => void onProLeave()}
            >
              {t('plugin.meetingProLeave')}
            </Button>
          )}
          <Button
            size="small"
            icon={muted ? <AudioMutedOutlined /> : <AudioOutlined />}
            disabled={controlsDisabled || !proJoined}
            data-testid="meeting-pro-mute"
            onClick={() => void toggleProMute()}
          >
            {muted ? t('plugin.meetingProUnmute') : t('plugin.meetingProMute')}
          </Button>
          <Button
            size="small"
            icon={<VideoCameraOutlined />}
            disabled={controlsDisabled || !proJoined}
            data-testid="meeting-pro-camera"
            onClick={() => void toggleProCamera()}
          >
            {cameraEnabled ? t('plugin.meetingProCameraOff') : t('plugin.meetingProCameraOn')}
          </Button>
          <Button
            size="small"
            icon={<DesktopOutlined />}
            disabled={controlsDisabled || !proJoined}
            data-testid="meeting-pro-screenshare"
            onClick={() => void toggleProScreenShare()}
          >
            {proScreenSharing ? t('plugin.meetingProScreenShareStop') : t('plugin.meetingProScreenShareStart')}
          </Button>
        </Space>
      </div>
      <Space size={6} wrap className={styles.meetingMenuActions}>
        {!recording ? (
          <Button
            size="small"
            icon={<PlayCircleOutlined />}
            disabled={controlsDisabled || recordingSaving || recordingPhase === 'saving' || !inMeeting}
            data-testid="meeting-record-start"
            onClick={() => void onStartRecord()}
          >
            {t('plugin.meetingRecordStart')}
          </Button>
        ) : (
          <Button
            size="small"
            danger
            icon={<StopOutlined />}
            disabled={controlsDisabled || recordingSaving}
            data-testid="meeting-record-stop"
            onClick={() => void onStopRecord()}
          >
            {t('plugin.meetingRecordStop')}
          </Button>
        )}
        <Popover
          title={t('plugin.meetingScheduleTitlePopover')}
          trigger="click"
          content={
            <MeetingSchedulePanel
              groupId={groupId}
              disabled={controlsDisabled}
              onJoinMeeting={onScheduleJoin}
              joinMeetingDisabled={controlsDisabled || joined || proJoined}
            />
          }
        >
          <Button size="small" icon={<CalendarOutlined />} disabled={controlsDisabled} data-testid="meeting-schedule-button">
            {t('plugin.meetingScheduleTitlePopover')}
          </Button>
        </Popover>
        <Popover title={t('plugin.meetingToolbarDetails')} trigger="click" content={detailContent}>
          <Button size="small" icon={<InfoCircleOutlined />}>
            {t('plugin.meetingToolbarDetails')}
          </Button>
        </Popover>
      </Space>
      {remoteStream ? (
        <video
          className={styles.meetingRemotePreview}
          autoPlay
          playsInline
          muted
          ref={(el) => {
            if (el) el.srcObject = remoteStream
          }}
        />
      ) : null}
    </div>
  )

  return (
    <>
      <Modal
        title={t('plugin.meetingShareScreenPick')}
        open={sourceModalOpen}
        onCancel={() => setSourceModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <List
          size="small"
          dataSource={desktopSources}
          locale={{ emptyText: t('plugin.meetingDesktopEmpty') }}
          renderItem={(item) => (
            <List.Item>
              <Button type="link" onClick={() => void onShareSource(item.id)}>
                {item.name}
              </Button>
            </List.Item>
          )}
        />
      </Modal>
      <div className={styles.meetingToolbar} data-plugin-id={plugin.id} data-testid="meeting-toolbar">
        <Popover content={menuContent} trigger="click" placement="topLeft">
          <span className={styles.meetingToolbarTrigger}>
            <ComposerIconButton
              icon={<VideoCameraOutlined />}
              label={t('plugin.meetingToolbarMenu')}
              data-testid="meeting-toolbar-menu"
            />
          </span>
        </Popover>
      </div>
    </>
  )
}
