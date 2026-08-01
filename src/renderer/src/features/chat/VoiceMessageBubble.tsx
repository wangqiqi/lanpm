import { useEffect, useState } from 'react'
import { AudioOutlined } from '@ant-design/icons'
import { formatVoiceDuration } from '@shared/chat/voiceMessage'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './chat.module.css'

interface Props {
  fileId: string
  durationMs: number
}

export default function VoiceMessageBubble({ fileId, durationMs }: Props): React.ReactElement {
  const { t } = useI18n()
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    void getLanpmApi()
      .file.getPreviewUrl(fileId)
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [fileId])

  if (failed) {
    return (
      <div className={styles.voiceBubble} data-testid="voice-message-bubble">
        <AudioOutlined aria-hidden />
        <span>{t('chat.voicePlayFailed')}</span>
      </div>
    )
  }

  return (
    <div className={styles.voiceBubble} data-testid="voice-message-bubble">
      <AudioOutlined className={styles.voiceBubbleIcon} aria-hidden />
      {src ? (
        <audio className={styles.voiceAudio} controls preload="metadata" src={src}>
          {t('chat.voicePlayFailed')}
        </audio>
      ) : (
        <span className={styles.voiceBubbleLoading}>{t('chat.voiceLoading')}</span>
      )}
      <span className={styles.voiceDuration}>{formatVoiceDuration(durationMs)}</span>
    </div>
  )
}
