import { useState } from 'react'
import { Input, Modal, Typography } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'

const { Text } = Typography

interface ManualPeerModalProps {
  open: boolean
  loading?: boolean
  onClose: () => void
  onSubmit: (address: string) => Promise<void>
}

export default function ManualPeerModal({
  open,
  loading = false,
  onClose,
  onSubmit
}: ManualPeerModalProps): React.ReactElement {
  const { t } = useI18n()
  const [address, setAddress] = useState('')

  const handleOk = async (): Promise<void> => {
    await onSubmit(address.trim())
    setAddress('')
  }

  return (
    <Modal
      title={t('topbar.manualPeerTitle')}
      open={open}
      onCancel={() => {
        setAddress('')
        onClose()
      }}
      onOk={() => void handleOk()}
      okText={t('topbar.manualPeerOk')}
      confirmLoading={loading}
      destroyOnClose
    >
      <Text type="secondary">{t('topbar.manualPeerHint')}</Text>
      <Input
        style={{ marginTop: 12 }}
        placeholder={t('topbar.manualPeerPlaceholder')}
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        onPressEnter={() => void handleOk()}
        autoFocus
      />
    </Modal>
  )
}
