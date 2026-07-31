import { LoadingOutlined } from '@ant-design/icons'
import region from './regionInteract.module.css'
import styles from './RegionButton.module.css'

type RegionButtonVariant =
  | 'icon'
  | 'pill'
  | 'text'
  | 'toolbar'
  | 'caption'
  | 'user'
  | 'emphasis'

export interface RegionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RegionButtonVariant
  selected?: boolean
  loading?: boolean
  children: React.ReactNode
}

export default function RegionButton({
  variant = 'pill',
  selected = false,
  loading = false,
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
              : variant === 'emphasis'
                ? styles.emphasis
                : styles.pill

  const isDisabled = Boolean(disabled || loading)

  return (
    <button
      type="button"
      className={[
        styles.btn,
        region.region,
        variantClass,
        selected ? region.regionSelected : '',
        isDisabled ? region.regionDisabled : '',
        loading ? styles.loading : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <LoadingOutlined className={styles.spinner} spin aria-hidden /> : null}
      {children}
    </button>
  )
}
