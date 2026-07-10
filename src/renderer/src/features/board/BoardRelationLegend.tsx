import { TASK_FAMILY_COLORS } from '@shared/task/taskFamilyColors'
import { useI18n } from '@renderer/i18n/useI18n'
import scheduleStyles from '@renderer/styles/scheduleHealth.module.css'
import styles from './board.module.css'

/** 看板工具栏：任务族色 + 工期健康度图例 */
export default function BoardRelationLegend(): React.ReactElement {
  const { t } = useI18n()

  return (
    <div className={styles.relationLegend} aria-label={t('board.legendAria')}>
      <div className={styles.legendSwatches} role="presentation">
        {TASK_FAMILY_COLORS.map((color, i) => (
          <span
            key={i}
            className={styles.legendSwatch}
            style={{ backgroundColor: color }}
            title={t('board.legendFamilyItem', { index: i + 1 })}
          />
        ))}
      </div>
      <span className={styles.legendHint}>{t('board.legendToolbar')}</span>
      <span className={styles.legendDivider} aria-hidden>
        ·
      </span>
      <div className={styles.legendSwatches} role="presentation">
        <span
          className={`${styles.legendSwatch} ${styles.legendDepIn}`}
          title={t('board.legendDepIn')}
        />
        <span
          className={`${styles.legendSwatch} ${styles.legendDepOut}`}
          title={t('board.legendDepOut')}
        />
        <span
          className={`${styles.legendSwatch} ${styles.legendDepDim}`}
          title={t('board.legendDepDim')}
        />
      </div>
      <span className={styles.legendHint}>{t('board.legendDepLines')}</span>
      <span className={styles.legendDivider} aria-hidden>
        ·
      </span>
      <div className={styles.legendSwatches} role="presentation">
        <span
          className={`${styles.legendSwatch} ${scheduleStyles.legendSwatchOnTrack}`}
          title={t('board.scheduleOnTrackHint')}
        />
        <span
          className={`${styles.legendSwatch} ${scheduleStyles.legendSwatchBehind}`}
          title={t('board.scheduleBehindHint')}
        />
        <span
          className={`${styles.legendSwatch} ${scheduleStyles.legendSwatchOverdue}`}
          title={t('board.scheduleOverdueHint')}
        />
      </div>
      <span className={styles.legendHint}>{t('board.legendSchedule')}</span>
    </div>
  )
}
