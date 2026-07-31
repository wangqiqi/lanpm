import { useMemo } from 'react'
import {
  Button,
  Divider,
  List,
  Popover,
  Space,
  Tag,
  Tooltip,
  Typography,
  message
} from 'antd'
import {
  AudioMutedOutlined,
  AudioOutlined,
  DesktopOutlined,
  InfoCircleOutlined,
  LoginOutlined,
  LogoutOutlined,
  VideoCameraOutlined
} from '@ant-design/icons'
import type { PluginView } from '@shared/plugin/types'
import { useI18n } from '@renderer/i18n/useI18n'
import { isPluginLicenseActive } from '@renderer/plugin/pluginLicense'
import { openProfileTab } from '@renderer/plugin/openProfileTab'
import { useMeetingMesh } from './useMeetingMesh'
import { useMeetingLiveKit } from './useMeetingLiveKit'
import styles from '../plugin.module.css'

const { Text } = Typography

interface Props {
  plugin: PluginView
  groupId: string
}

/** 聊天 `chat.toolbar.media` 紧凑会议工具条 + Popover 详情 */
export default function MeetingToolbar({ plugin, groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const licenseActive = isPluginLicenseActive(plugin)

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
  const controlsDisabled = !licenseActive

  const liteStatusLabel = useMemo(() => {
    if (!joined) return t('plugin.meetingStatusIdle')
    return t('plugin.meetingMeshStatus', { status: meshStatus })
  }, [joined, meshStatus, t])

  const proStatusLabel = useMemo(() => {
    if (!liveKitConfigured) return t('plugin.meetingProNotConfigured')
    if (sdkMissing) return t('plugin.meetingProSdkMissing')
    return t('plugin.meetingProStatus', { status: proStatus })
  }, [liveKitConfigured, proStatus, sdkMissing, t])

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

  const detailContent = (
    <div className={styles.meetingPopover}>
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
          {liteStatusLabel}
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
      <Divider orientation="left" plain>
        {t('plugin.meetingProSection')}
      </Divider>
      <Text type="secondary" className={styles.meetingState}>
        {proStatusLabel}
      </Text>
      {!liveKitConfigured ? (
        <Button type="link" size="small" onClick={() => openProfileTab('meeting')}>
          {t('plugin.meetingOpenMeetingConfig')}
        </Button>
      ) : null}
    </div>
  )

  return (
    <div className={styles.meetingToolbar} data-plugin-id={plugin.id} data-testid="meeting-toolbar">
      <Space size={6} wrap align="center">
        <Tag color={joined ? 'processing' : 'default'}>{liteStatusLabel}</Tag>
        <Tag color={proJoined ? 'success' : liveKitConfigured ? 'default' : 'warning'}>
          {proJoined ? t('plugin.meetingStatusProLive') : proStatusLabel}
        </Tag>

        {!joined ? (
          <Tooltip title={t('plugin.meetingJoin')}>
            <Button
              size="small"
              type="primary"
              icon={<LoginOutlined />}
              loading={busy}
              disabled={controlsDisabled || proJoined}
              aria-label={t('plugin.meetingJoin')}
              onClick={() => void onJoin()}
            />
          </Tooltip>
        ) : (
          <Tooltip title={t('plugin.meetingLeave')}>
            <Button
              size="small"
              danger
              icon={<LogoutOutlined />}
              loading={busy}
              disabled={controlsDisabled}
              aria-label={t('plugin.meetingLeave')}
              onClick={() => void onLeave()}
            />
          </Tooltip>
        )}

        <Tooltip title={t('plugin.meetingScreenStub')}>
          <Button
            size="small"
            icon={<DesktopOutlined />}
            loading={busy}
            disabled={controlsDisabled || !joined}
            aria-label={t('plugin.meetingScreenStub')}
            onClick={() => void onDesktop()}
          />
        </Tooltip>

        {!proJoined ? (
          <Tooltip title={t('plugin.meetingProJoin')}>
            <Button
              size="small"
              type="primary"
              icon={<VideoCameraOutlined />}
              loading={busy}
              disabled={controlsDisabled || !liveKitConfigured || joined || sdkMissing}
              aria-label={t('plugin.meetingProJoin')}
              onClick={() => void onProJoin()}
            />
          </Tooltip>
        ) : (
          <Tooltip title={t('plugin.meetingProLeave')}>
            <Button
              size="small"
              danger
              icon={<LogoutOutlined />}
              loading={busy}
              disabled={controlsDisabled}
              aria-label={t('plugin.meetingProLeave')}
              onClick={() => void onProLeave()}
            />
          </Tooltip>
        )}

        <Tooltip title={muted ? t('plugin.meetingProUnmute') : t('plugin.meetingProMute')}>
          <Button
            size="small"
            icon={muted ? <AudioMutedOutlined /> : <AudioOutlined />}
            disabled={controlsDisabled || !proJoined}
            aria-label={muted ? t('plugin.meetingProUnmute') : t('plugin.meetingProMute')}
            onClick={() => void toggleProMute()}
          />
        </Tooltip>

        <Popover
          title={t('plugin.meetingToolbarDetails')}
          trigger="click"
          content={detailContent}
        >
          <Button
            size="small"
            icon={<InfoCircleOutlined />}
            aria-label={t('plugin.meetingToolbarDetails')}
          />
        </Popover>
      </Space>

      {!licenseActive ? (
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
      ) : null}
    </div>
  )
}
