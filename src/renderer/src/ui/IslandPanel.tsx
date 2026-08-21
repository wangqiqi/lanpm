import { useId, useState } from 'react'
import { DownOutlined } from '@ant-design/icons'
import styles from './IslandPanel.module.css'

export interface IslandPanelProps {
  title?: string
  extra?: React.ReactNode
  className?: string
  titleClassName?: string
  headerClassName?: string
  bodyClassName?: string
  children: React.ReactNode
  /** Surface-only island chrome (no visible header; use with aria-label) */
  hideHeader?: boolean
  'aria-label'?: string
  /** Collapsed-state teaser; presence (or expand props) enables accordion */
  summary?: React.ReactNode
  defaultCollapsed?: boolean
  expanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  'data-testid'?: string
  /** Scroll / measure target on the panel body (not the chrome) */
  bodyTestId?: string
}

/** Island-style accordion panel (Cockpit · Board · Calendar/Tree surface) */
export default function IslandPanel({
  title = '',
  extra,
  className = '',
  titleClassName = '',
  headerClassName = '',
  bodyClassName = '',
  children,
  hideHeader = false,
  'aria-label': ariaLabel,
  summary,
  defaultCollapsed,
  expanded: expandedControlled,
  onExpandedChange,
  'data-testid': dataTestId,
  bodyTestId
}: IslandPanelProps): React.ReactElement {
  const regionId = useId()
  const collapsible =
    !hideHeader &&
    (summary !== undefined ||
      defaultCollapsed !== undefined ||
      expandedControlled !== undefined ||
      onExpandedChange !== undefined)
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(() => !defaultCollapsed)
  const expanded = expandedControlled ?? uncontrolledExpanded

  const setExpanded = (next: boolean): void => {
    if (expandedControlled === undefined) {
      setUncontrolledExpanded(next)
    }
    onExpandedChange?.(next)
  }

  const toggle = (): void => {
    setExpanded(!expanded)
  }

  const bodyClass = `${styles.panelBody} ${hideHeader ? styles.panelBodyFlush : ''} ${bodyClassName}`.trim()

  return (
    <section
      className={`${styles.panel} ${className}`.trim()}
      data-testid={dataTestId}
      aria-label={hideHeader ? ariaLabel : undefined}
    >
      {!hideHeader ? (
        <header
          className={`${styles.panelHeader} ${collapsible ? styles.panelHeaderCollapsible : ''} ${headerClassName}`.trim()}
        >
          {collapsible ? (
            <button
              type="button"
              className={styles.panelToggle}
              aria-expanded={expanded}
              aria-controls={regionId}
              onClick={toggle}
            >
              <DownOutlined
                className={`${styles.panelChevron} ${expanded ? styles.panelChevronOpen : ''}`.trim()}
                aria-hidden
              />
              <h2 className={`${styles.panelTitle} ${titleClassName}`.trim()}>{title}</h2>
            </button>
          ) : (
            <h2 className={`${styles.panelTitle} ${titleClassName}`.trim()}>{title}</h2>
          )}
          {extra ? <div className={styles.panelExtra}>{extra}</div> : null}
        </header>
      ) : null}
      {collapsible ? (
        <div id={regionId}>
          {!expanded && summary != null ? (
            <div className={styles.panelSummary}>{summary}</div>
          ) : null}
          {expanded ? <div className={bodyClass} data-testid={bodyTestId}>{children}</div> : null}
        </div>
      ) : (
        <div className={bodyClass} data-testid={bodyTestId}>
          {children}
        </div>
      )}
    </section>
  )
}
