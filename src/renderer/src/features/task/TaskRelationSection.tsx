import { Button, Tag, Typography } from 'antd'
import type { BoardRelationBlocker } from '@shared/task/boardRelations'
import type { Task } from '@shared/task/types'
import type { TaskLocateView } from '@renderer/features/task/useLocateTask'
import { useI18n } from '@renderer/i18n/useI18n'
import styles from './taskRelation.module.css'

const { Text } = Typography

interface TaskRelationSectionProps {
  task: Task
  tasks: Task[]
  predecessors: BoardRelationBlocker[]
  successors: BoardRelationBlocker[]
  onLocate: (taskId: string, view: TaskLocateView) => void
}

function depStatusLabel(
  blocker: BoardRelationBlocker,
  tasks: Task[],
  t: (key: 'board.columnTodo' | 'board.columnDoing' | 'board.columnDone' | 'board.columnOther') => string
): string {
  const ref = tasks.find((x) => x.taskId === blocker.taskId)
  if (!ref) return ''
  const statusKey =
    ref.status === 'todo'
      ? 'board.columnTodo'
      : ref.status === 'doing'
        ? 'board.columnDoing'
        : ref.status === 'done'
          ? 'board.columnDone'
          : 'board.columnOther'
  return t(statusKey)
}

export default function TaskRelationSection({
  task,
  tasks,
  predecessors,
  successors,
  onLocate
}: TaskRelationSectionProps): React.ReactElement | null {
  const { t } = useI18n()

  if (predecessors.length === 0 && successors.length === 0) {
    return null
  }

  return (
    <section className={styles.section} aria-label={t('task.relationsSection')}>
      <Text type="secondary" className={styles.sectionTitle}>
        {t('task.relationsSection')}
      </Text>

      {predecessors.length > 0 && (
        <div className={styles.group}>
          <Text type="secondary" className={styles.groupLabel}>
            {t('task.predecessors')}
          </Text>
          <ul className={styles.list}>
            {predecessors.map((b) => (
              <li key={`${b.taskId}-${b.type}`} className={styles.listItem}>
                <Tag bordered={false} className={styles.typeTag}>
                  {b.type}
                </Tag>
                <span className={styles.itemTitle}>{b.title}</span>
                <Text type="secondary" className={styles.itemMeta}>
                  {depStatusLabel(b, tasks, t)}
                </Text>
                <Button
                  type="link"
                  size="small"
                  className={styles.locateBtn}
                  onClick={() => onLocate(b.taskId, 'board')}
                >
                  {t('task.openInBoard')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {successors.length > 0 && (
        <div className={styles.group}>
          <Text type="secondary" className={styles.groupLabel}>
            {t('task.successors')}
          </Text>
          <ul className={styles.list}>
            {successors.map((b) => (
              <li key={`${b.taskId}-${b.type}`} className={styles.listItem}>
                <Tag bordered={false} className={styles.typeTag}>
                  {b.type}
                </Tag>
                <span className={styles.itemTitle}>{b.title}</span>
                <Text type="secondary" className={styles.itemMeta}>
                  {depStatusLabel(b, tasks, t)}
                </Text>
                <Button
                  type="link"
                  size="small"
                  className={styles.locateBtn}
                  onClick={() => onLocate(b.taskId, 'board')}
                >
                  {t('task.openInBoard')}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.selfLocate}>
        <Button type="link" size="small" onClick={() => onLocate(task.taskId, 'board')}>
          {t('task.openCurrentInBoard')}
        </Button>
        <Button type="link" size="small" onClick={() => onLocate(task.taskId, 'tree')}>
          {t('task.openInTree')}
        </Button>
        <Button type="link" size="small" onClick={() => onLocate(task.taskId, 'gantt')}>
          {t('task.openInGantt')}
        </Button>
      </div>
    </section>
  )
}
