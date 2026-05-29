import styles from './RegionTabBar.module.css'

export interface RegionTabItem {
  key: string
  label: React.ReactNode
  title?: string
  active?: boolean
  disabled?: boolean
  onClick?: () => void
}

export interface RegionTabBarProps {
  items: RegionTabItem[]
  ariaLabel?: string
  /** Allow horizontal scroll for many tabs (default true) */
  scrollable?: boolean
}

export default function RegionTabBar({
  items,
  ariaLabel,
  scrollable = true
}: RegionTabBarProps): React.ReactElement {
  return (
    <div
      className={[styles.bar, scrollable ? styles.scrollable : ''].filter(Boolean).join(' ')}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => (
        <span key={item.key} className={styles.slot}>
          <span
            className={[styles.wrap, item.disabled ? styles.wrapDisabled : ''].filter(Boolean).join(' ')}
          >
            <button
              type="button"
              role="tab"
              aria-selected={item.active ?? false}
              aria-disabled={item.disabled}
              className={[styles.tab, item.active ? styles.tabSelected : ''].filter(Boolean).join(' ')}
              disabled={item.disabled}
              title={item.title}
              onClick={item.onClick}
            >
              {item.label}
            </button>
          </span>
        </span>
      ))}
    </div>
  )
}
