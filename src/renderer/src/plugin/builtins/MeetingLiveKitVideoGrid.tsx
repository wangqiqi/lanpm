import { useEffect, useRef } from 'react'
import { List, Typography } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import type { ProParticipantView } from './useMeetingLiveKit'
import styles from '../plugin.module.css'

const { Text } = Typography

function VideoTile({
  track,
  label,
  mutedPlayback,
  isScreen
}: {
  track: MediaStreamTrack | null
  label: string
  mutedPlayback?: boolean
  isScreen?: boolean
}): React.ReactElement {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!track) {
      el.srcObject = null
      return
    }
    const stream = new MediaStream([track])
    el.srcObject = stream
    void el.play().catch(() => {})
    return () => {
      el.srcObject = null
    }
  }, [track])

  const tileClass = [styles.meetingVideoTile, isScreen ? styles.meetingVideoTileScreen : '']
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={tileClass}
      data-testid={isScreen ? 'meeting-livekit-video-tile-screen' : 'meeting-livekit-video-tile'}
    >
      {track ? (
        <video ref={ref} className={styles.meetingVideoEl} playsInline autoPlay muted={mutedPlayback} />
      ) : (
        <div className={styles.meetingVideoPlaceholder} aria-hidden />
      )}
      <Text className={styles.meetingVideoLabel} ellipsis>
        {label}
      </Text>
    </div>
  )
}

interface Props {
  participants: ProParticipantView[]
  joined: boolean
  participantsLabel: string
}

/** Popover 内 LiveKit 视频格 + 参会者列表 */
export default function MeetingLiveKitVideoGrid({
  participants,
  joined,
  participantsLabel
}: Props): React.ReactElement | null {
  const { t } = useI18n()
  if (!joined) return null

  const tiles = participants.flatMap((p) => {
    const items: Array<{
      key: string
      track: MediaStreamTrack | null
      label: string
      muted?: boolean
      isScreen?: boolean
    }> = []
    if (p.screenShareTrack) {
      items.push({
        key: `${p.identity}-screen`,
        track: p.screenShareTrack,
        label: t('plugin.meetingTileScreen', { name: p.name }),
        isScreen: true
      })
    }
    items.push({
      key: `${p.identity}-cam`,
      track: p.videoTrack,
      label: p.name,
      muted: p.isLocal
    })
    return items
  })

  return (
    <div className={styles.meetingLiveKitGrid} data-testid="meeting-livekit-video-grid">
      <Text type="secondary" className={styles.meetingState}>
        {participantsLabel}
      </Text>
      <div className={styles.meetingVideoGrid}>
        {tiles.map((tile) => (
          <VideoTile
            key={tile.key}
            track={tile.track}
            label={tile.label}
            mutedPlayback={tile.muted}
            isScreen={tile.isScreen}
          />
        ))}
      </div>
      <List
        size="small"
        className={styles.meetingParticipants}
        dataSource={participants}
        renderItem={(p) => (
          <List.Item>
            <Text>
              {p.name}
              {p.isLocal ? ` · ${t('plugin.meetingParticipantLocal')}` : ''}
              {p.audioMuted ? ` · ${t('plugin.meetingParticipantMuted')}` : ''}
            </Text>
          </List.Item>
        )}
      />
    </div>
  )
}
