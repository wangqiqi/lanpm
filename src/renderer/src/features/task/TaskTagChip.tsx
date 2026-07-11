import { Tag } from 'antd'
import { resolveTagColor } from '@shared/task/tags'
import styles from './taskTagChip.module.css'

interface TaskTagChipProps {
  label: string
  /** tagKey → css color overrides */
  colorOverrides?: Readonly<Record<string, string>> | null
  className?: string
  onClick?: () => void
}

/** Colored board/tree tag chip (hash default + optional override). */
export default function TaskTagChip({
  label,
  colorOverrides,
  className,
  onClick
}: TaskTagChipProps): React.ReactElement {
  const bg = resolveTagColor(label, colorOverrides)
  return (
    <Tag
      bordered={false}
      className={[styles.chip, className].filter(Boolean).join(' ')}
      style={{ background: bg, color: '#fff' }}
      onClick={onClick}
    >
      {label}
    </Tag>
  )
}
