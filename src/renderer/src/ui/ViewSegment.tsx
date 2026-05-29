import styles from './ViewSegment.module.css'

export interface ViewSegmentOption<T extends string = string> {
  value: T
  label: React.ReactNode
  disabled?: boolean
  title?: string
}

export interface ViewSegmentProps<T extends string = string> {
  value: T
  options: ViewSegmentOption<T>[]
  onChange: (value: T) => void
  ariaLabel?: string
  /** Stretch items to equal width within the bar (default true) */
  equalWidth?: boolean
  /** Horizontal scroll when content overflows (default false) */
  scrollable?: boolean
  className?: string
}

export default function ViewSegment<T extends string = string>({
  value,
  options,
  onChange,
  ariaLabel,
  equalWidth = true,
  scrollable = false,
  className = ''
}: ViewSegmentProps<T>): React.ReactElement {
  return (
    <div
      className={[
        styles.bar,
        equalWidth ? styles.equalWidth : '',
        scrollable ? styles.scrollable : '',
        className
      ]
        .filter(Boolean)
        .join(' ')}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <span key={opt.value} className={styles.slot}>
            <span
              className={[styles.wrap, selected ? styles.wrapSelected : ''].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                className={[styles.tab, selected ? styles.tabSelected : ''].filter(Boolean).join(' ')}
                disabled={opt.disabled}
                title={opt.title}
                onClick={() => {
                  if (!opt.disabled) onChange(opt.value)
                }}
              >
                {opt.label}
              </button>
            </span>
          </span>
        )
      })}
    </div>
  )
}
