import { TASK_FAMILY_COLORS } from '@shared/task/taskFamilyColors'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './board.module.css'

/** 看板工具栏：任务族色条图例（与 taskFamily 配色一致） */
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
    </div>
  )
}
