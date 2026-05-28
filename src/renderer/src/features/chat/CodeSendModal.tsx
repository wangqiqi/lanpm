import { Modal, Select, Input } from 'antd'
import { useState } from 'react'
import { CODE_LANGUAGE_OPTIONS, detectLanguage } from '@shared/chat/detectLanguage'

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
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal
      title="发送代码块"
      open={open}
      onCancel={onClose}
      onOk={() => void handleOk()}
      okText="发送"
      cancelText="取消"
      confirmLoading={sending}
      width={640}
      destroyOnClose
    >
      <div style={{ marginBottom: 8 }}>
        <span style={{ marginRight: 8 }}>语言</span>
        <Select
          value={language}
          style={{ width: 160 }}
          options={CODE_LANGUAGE_OPTIONS.map((v) => ({
            value: v,
            label: v === 'auto' ? '自动识别' : v
          }))}
          onChange={setLanguage}
        />
        <span style={{ marginLeft: 12, opacity: 0.65, fontSize: 12 }}>
          识别结果：{previewLang}
        </span>
      </div>
      <TextArea
        placeholder="粘贴或输入代码…"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoSize={{ minRows: 8, maxRows: 16 }}
        style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }}
      />
    </Modal>
  )
}
