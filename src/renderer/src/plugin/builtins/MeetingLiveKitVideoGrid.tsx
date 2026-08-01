import { useEffect, useRef } from 'react'
import { List, Typography } from 'antd'
import type { ProParticipantView } from './useMeetingLiveKit'
import styles from '../plugin.module.css'

const { Text } = Typography

function VideoTile({
  track,
  label,
  mutedPlayback
}: {
  track: MediaStreamTrack | null
  label: string
  mutedPlayback?: boolean
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

  return (
    <div className={styles.meetingVideoTile} data-testid="meeting-livekit-video-tile">
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
  if (!joined) return null

  const tiles = participants.flatMap((p) => {
    const items: Array<{ key: string; track: MediaStreamTrack | null; label: string; muted?: boolean }> =
      []
    if (p.screenShareTrack) {
      items.push({
        key: `${p.identity}-screen`,
        track: p.screenShareTrack,
        label: `${p.name} (screen)`
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
              {p.isLocal ? ' · local' : ''}
              {p.audioMuted ? ' · muted' : ''}
            </Text>
          </List.Item>
        )}
      />
    </div>
  )
}
