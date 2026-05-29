import { Modal, Select, Input } from 'antd'
import { useLanpmApp } from '@renderer/hooks/useLanpmApp'
import { useState } from 'react'
import { CODE_LANGUAGE_OPTIONS, detectLanguage } from '@shared/chat/detectLanguage'
import { useI18n } from '@renderer/i18n/useI18n'
import { onCtrlEnter } from '@renderer/lib/inputKeyboard'

const { TextArea } = Input

interface CodeSendModalProps {
  open: boolean
  onClose: () => void
  onSend: (code: string, languageHint: string) => Promise<void>
}

export default function CodeSendModal({
  open,
  onClose,
  onSend
}: CodeSendModalProps): React.ReactElement {
  const { t, formatError } = useI18n()
  const { message } = useLanpmApp()
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState<string>('auto')
  const [sending, setSending] = useState(false)

  const previewLang = code.trim() ? detectLanguage(code, language) : '—'

  const handleOk = async (): Promise<void> => {
    const trimmed = code.trim()
    if (!trimmed) return
    setSending(true)
    try {
      await onSend(trimmed, language)
      setCode('')
      setLanguage('auto')
      onClose()
    } catch (err) {
      message.error(formatError(err, 'chat.codeSendFailed'))
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title={t('chat.codeModalTitle')}
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText={t('common.send')}
      cancelText={t('common.cancel')}
      confirmLoading={sending}
      width={640}
      destroyOnHidden
    >
      <div style={{ marginBottom: 8 }}>
        <span style={{ marginRight: 8 }}>{t('common.language')}</span>
        <Select
          value={language}
          style={{ width: 160 }}
          options={CODE_LANGUAGE_OPTIONS.map((v) => ({
            value: v,
            label: v === 'auto' ? t('common.autoDetect') : v
          }))}
          onChange={setLanguage}
        />
        <span style={{ marginLeft: 12, opacity: 0.65, fontSize: 12 }}>
          {t('chat.detectResult', { lang: previewLang })}
        </span>
      </div>
      <TextArea
        placeholder={t('chat.codePlaceholder')}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoSize={{ minRows: 8, maxRows: 16 }}
        style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
        onKeyDown={(e) => onCtrlEnter(e, () => void handleOk())}
      />
    </Modal>
  )
}
