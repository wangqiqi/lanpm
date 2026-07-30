import { Modal } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import NetworkPrereqContent from '../setup/NetworkPrereqContent'
import styles from './discover.module.css'

interface NetworkHelpModalProps {
  open: boolean
  onClose: () => void
}

/** 发现页只读组网帮助（复用 Setup 图示） */
export default function NetworkHelpModal({
  open,
  onClose
}: NetworkHelpModalProps): React.ReactElement {
  const { t } = useI18n()

  return (
    <Modal
      open={open}
      title={t('discover.netHelpTitle')}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      className={styles.netHelpModal}
    >
      <p className={styles.netHelpIntro}>{t('setup.netSubtitle')}</p>
      <NetworkPrereqContent />
    </Modal>
  )
}
