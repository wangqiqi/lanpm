import { QuestionCircleOutlined } from '@ant-design/icons'
import { Popover } from 'antd'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './ViewHelpButton.module.css'

interface ViewHelpButtonProps {
  content: React.ReactNode
  className?: string
  buttonClassName?: string
}

/** 视图内 `?` 帮助：点击 Popover 展示说明，替代常驻工具栏长文案 */
export default function ViewHelpButton({
  content,
  className,
  buttonClassName
}: ViewHelpButtonProps): React.ReactElement {
  const { t } = useI18n()

  return (
    <Popover
      content={<div className={styles.popoverBody}>{content}</div>}
      trigger="click"
      placement="bottomRight"
    >
      <button
        type="button"
        className={[buttonClassName ?? styles.btn, className].filter(Boolean).join(' ')}
        aria-label={t('common.viewHelp')}
      >
        <QuestionCircleOutlined />
      </button>
    </Popover>
  )
}
