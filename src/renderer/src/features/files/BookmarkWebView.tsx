import { isBrowserPreview } from '@renderer/platform/browserPreview'
import { useI18n } from '@renderer/i18n/useI18n'
import { Typography } from 'antd'
import styles from './files.module.css'

const { Text, Link } = Typography

interface BookmarkWebViewProps {
  url: string
  title?: string
}

/** 书签内嵌浏览（PRD-F-03）；Electron `<webview>`，浏览器预览降级外链 */
export default function BookmarkWebView({ url, title }: BookmarkWebViewProps): React.ReactElement {
  const { t } = useI18n()

  if (isBrowserPreview()) {
    return (
      <div className={styles.bookmarkPreview}>
        <Text strong>{title}</Text>
        <Text type="secondary">{t('files.bookmarkWebviewBrowserHint')}</Text>
        <Link href={url} target="_blank" rel="noreferrer">
          {url}
        </Link>
      </div>
    )
  }

  return (
    <webview
      src={url}
      className={styles.bookmarkWebview}
      title={title ?? url}
      allowpopups
    />
  )
}
