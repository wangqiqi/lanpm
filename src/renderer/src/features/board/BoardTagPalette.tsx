import { ColorPicker, Popover, Button } from 'antd'
import { BgColorsOutlined } from '@ant-design/icons'
import { useMemo } from 'react'
import { resolveTagColor, taskTagKey } from '@shared/task/tags'
import { useI18n } from '@renderer/i18n/useI18n'
import { useGroupTagStore } from '@renderer/stores/groupTagStore'
import { groupTagMetaToColorMap } from '@shared/task/groupTagMeta'
import styles from './board.module.css'

interface BoardTagPaletteProps {
  groupId: string
  tags: string[]
}

export default function BoardTagPalette({
  groupId,
  tags
}: BoardTagPaletteProps): React.ReactElement | null {
  const { t } = useI18n()
  const rows = useGroupTagStore((s) => s.byGroup[groupId] ?? [])
  const colorMap = useMemo(() => groupTagMetaToColorMap(rows), [rows])
  const upsert = useGroupTagStore((s) => s.upsert)

  if (tags.length === 0) return null

  const content = (
    <div className={styles.tagPalettePanel}>
      <div className={styles.tagPaletteHint}>{t('board.tagPaletteSyncedHint')}</div>
      {tags.map((label) => {
        const key = taskTagKey(label)
        const value = resolveTagColor(label, colorMap)
        return (
          <div key={key} className={styles.tagPaletteRow}>
            <span className={styles.tagPaletteLabel}>{label}</span>
            <ColorPicker
              size="small"
              value={value}
              onChangeComplete={(c) => {
                void upsert(groupId, key, c.toHexString())
              }}
            />
          </div>
        )
      })}
    </div>
  )

  return (
    <Popover content={content} title={t('board.tagPalette')} trigger="click" placement="bottomLeft">
      <Button type="text" size="small" icon={<BgColorsOutlined />} aria-label={t('board.tagPalette')}>
        {t('board.tagPalette')}
      </Button>
    </Popover>
  )
}
