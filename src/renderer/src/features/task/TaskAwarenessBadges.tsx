import type { AwarenessPeer } from '@renderer/stores/taskAwarenessStore'
import { useI18n } from '@renderer/i18n/useI18n'
import { awarenessPeerHue } from './awarenessPeerHue'
import styles from './taskAwareness.module.css'

interface TaskAwarenessBadgesProps {
  peers: AwarenessPeer[]
  compact?: boolean
}

/** Remote focus Presence chips on a task card/row. */
export default function TaskAwarenessBadges({
  peers,
  compact = false
}: TaskAwarenessBadgesProps): React.ReactElement | null {
  const { t } = useI18n()
  if (peers.length === 0) return null

  const label = peers.map((p) => p.displayName).join(', ')
  return (
    <div
      className={`${styles.badges} ${compact ? styles.compact : ''}`}
      title={t('task.awarenessFocusing', { names: label })}
      aria-label={t('task.awarenessFocusing', { names: label })}
    >
      {peers.slice(0, 3).map((p) => (
        <span
          key={`${p.userId}-${p.clientId ?? ''}`}
          className={styles.dot}
          style={{ background: `hsl(${awarenessPeerHue(p.userId)} 55% 48%)` }}
        >
          {!compact && <span className={styles.name}>{p.displayName}</span>}
        </span>
      ))}
      {peers.length > 3 && <span className={styles.more}>+{peers.length - 3}</span>}
    </div>
  )
}
