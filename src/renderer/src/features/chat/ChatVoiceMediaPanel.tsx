import { useCallback, useRef } from 'react'
import { Button, Typography, message } from 'antd'
import { AudioOutlined } from '@ant-design/icons'
import { formatVoiceDuration } from '@shared/chat/voiceMessage'
import { getLanpmApi } from '@renderer/platform/installLanpmBridge'
import { useI18n } from '@renderer/i18n/useI18n'
import { chatStoreActions } from './chatStoreActions'
import { useVoiceRecorder } from './useVoiceRecorder'
import styles from './chat.module.css'

const { Text } = Typography

interface Props {
  groupId: string
}

/** 聊天语音模式：按住说话发送 voice 消息；会议控制在 Composer 工具栏 */
export default function ChatVoiceMediaPanel({ groupId }: Props): React.ReactElement {
  const { t } = useI18n()
  const { recording, elapsedMs, start, stop, cancel, maxMs } = useVoiceRecorder()
  const holdingRef = useRef(false)
  const sendingRef = useRef(false)

  const finishHold = useCallback(async () => {
    if (!holdingRef.current || sendingRef.current) return
    holdingRef.current = false
    sendingRef.current = true
    try {
      const payload = await stop()
      if (!payload) {
        cancel()
        return
      }
      const msg = await getLanpmApi().chat.sendVoice(
        groupId,
        payload.audioBase64,
        payload.durationMs,
        payload.mimeType
      )
      chatStoreActions.upsertMessage(msg)
    } catch (err) {
      message.error(err instanceof Error ? err.message : t('chat.voiceSendFailed'))
      cancel()
    } finally {
      sendingRef.current = false
    }
  }, [cancel, groupId, stop, t])

  const onHoldStart = useCallback(() => {
    if (sendingRef.current) return
    holdingRef.current = true
    void start().catch((err: unknown) => {
      holdingRef.current = false
      message.error(err instanceof Error ? err.message : t('chat.voiceMicDenied'))
    })
  }, [start, t])

  const onHoldEnd = useCallback(() => {
    void finishHold()
  }, [finishHold])

  return (
    <div className={styles.voicePanel} data-testid="chat-voice-media-panel">
      <Text type="secondary" className={styles.voiceHint}>
        {t('chat.voiceHoldHint')}
      </Text>
      <Button
        type={recording ? 'primary' : 'default'}
        shape="circle"
        size="large"
        className={styles.voiceHoldBtn}
        data-testid="chat-voice-hold-btn"
        icon={<AudioOutlined />}
        aria-label={t('chat.voiceHoldHint')}
        onMouseDown={(e) => {
          e.preventDefault()
          onHoldStart()
        }}
        onMouseUp={onHoldEnd}
        onMouseLeave={() => {
          if (holdingRef.current) onHoldEnd()
        }}
        onTouchStart={(e) => {
          e.preventDefault()
          onHoldStart()
        }}
        onTouchEnd={onHoldEnd}
      />
      {recording ? (
        <Text type="secondary" className={styles.voiceHint}>
          {formatVoiceDuration(elapsedMs)} / {formatVoiceDuration(maxMs)}
        </Text>
      ) : (
        <Text type="secondary" className={styles.voiceHint}>
          {t('chat.voicePanelHint')}
        </Text>
      )}
    </div>
  )
}
