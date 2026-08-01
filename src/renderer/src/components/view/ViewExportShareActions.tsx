import { Button } from 'antd'
import { CommentOutlined, DownloadOutlined } from '@ant-design/icons'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './ViewExportShareActions.module.css'

export interface ViewExportShareActionsProps {
  onDownload: () => void
  onShareToChat: () => void
  downloading?: boolean
  sharing?: boolean
  downloadDisabled?: boolean
  shareDisabled?: boolean
  downloadLabel?: string
  shareLabel?: string
}

/** Shared download + send-to-chat actions for gantt / whiteboard / mindmap toolbars. */
export default function ViewExportShareActions({
  onDownload,
  onShareToChat,
  downloading = false,
  sharing = false,
  downloadDisabled = false,
  shareDisabled = false,
  downloadLabel,
  shareLabel
}: ViewExportShareActionsProps): React.ReactElement {
  const { t } = useI18n()
  const dl = downloadLabel ?? t('viewExport.download')
  const share = shareLabel ?? t('files.shareToChat')

  return (
    <div className={styles.row} role="toolbar" aria-label={t('viewExport.toolbarAria')}>
      <Button
        size="small"
        icon={<DownloadOutlined />}
        loading={downloading}
        disabled={downloadDisabled}
        onClick={onDownload}
      >
        {dl}
      </Button>
      <Button
        size="small"
        icon={<CommentOutlined />}
        loading={sharing}
        disabled={shareDisabled}
        onClick={onShareToChat}
      >
        {share}
      </Button>
    </div>
  )
}
