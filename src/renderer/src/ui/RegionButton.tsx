import region from './regionInteract.module.css'
import styles from './RegionButton.module.css'

type RegionButtonVariant = 'icon' | 'pill' | 'text' | 'toolbar' | 'caption' | 'user'

export interface RegionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RegionButtonVariant
  selected?: boolean
  children: React.ReactNode
}

export default function RegionButton({
  variant = 'pill',
  selected = false,
  className = '',
  disabled,
  children,
  ...rest
}: RegionButtonProps): React.ReactElement {
  const variantClass =
    variant === 'icon'
      ? styles.icon
      : variant === 'text'
        ? styles.text
        : variant === 'toolbar'
          ? styles.toolbar
          : variant === 'caption'
            ? styles.caption
            : variant === 'user'
              ? styles.user
              : styles.pill

  return (
    <button
      type="button"
      className={[
        styles.btn,
        region.region,
        variantClass,
        selected ? region.regionSelected : '',
        disabled ? region.regionDisabled : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  )
}
