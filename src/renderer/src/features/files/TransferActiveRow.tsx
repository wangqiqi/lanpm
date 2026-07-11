import { Progress, Tag, Typography } from 'antd'
import type { FileTransferView } from '@shared/file/types'
import { canCancelTransfer } from '@shared/file/transferControl'
import RegionButton from '@renderer/ui/RegionButton'
import { useTransferRateHint } from './useTransferRateHint'
import styles from './files.module.css'

const { Text } = Typography

type Props = {
  tr: FileTransferView
  statusLabel: string
  localQueueLabel: string
  cancelLabel: string
  onCancel: (transferId: string) => void
}

export function TransferActiveRow({
  tr,
  statusLabel,
  localQueueLabel,
  cancelLabel,
  onCancel
}: Props): React.ReactElement {
  const rateHint = useTransferRateHint(tr)
  const showCancel = canCancelTransfer(tr.status)

  return (
    <div className={styles.transferRow}>
      <span>{tr.fileName}</span>
      <Progress
        percent={Math.round((tr.transferredBytes / Math.max(1, tr.totalBytes)) * 100)}
        size="small"
        style={{ flex: 1, margin: '0 12px' }}
      />
      {rateHint ? (
        <Text type="secondary" className={styles.transferRateHint}>
          {rateHint}
        </Text>
      ) : null}
      {tr.fromDeviceId === tr.toDeviceId ? <Tag color="default">{localQueueLabel}</Tag> : null}
      <Text type="secondary">{statusLabel}</Text>
      {showCancel ? (
        <RegionButton variant="caption" onClick={() => onCancel(tr.transferId)}>
          {cancelLabel}
        </RegionButton>
      ) : null}
    </div>
  )
}
