import RegionButton from '@renderer/ui/RegionButton'
import styles from './ComposerIconButton.module.css'

interface ComposerIconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string
}

/** 聊天输入区工具栏图标（与顶栏 icon 一致，无 Ant text 按钮） */
export default function ComposerIconButton({
  icon,
  label,
  className = '',
  ...rest
}: ComposerIconButtonProps): React.ReactElement {
  return (
    <RegionButton
      variant="icon"
      className={[styles.btn, className].filter(Boolean).join(' ')}
      aria-label={label}
      title={label}
      {...rest}
    >
      {icon}
    </RegionButton>
  )
}
