import { Modal, Typography } from 'antd'
import type { DeleteTaskMode } from '@shared/task/deleteMode'
import type { useI18n } from '@renderer/i18n/useI18n'

type TFn = ReturnType<typeof useI18n>['t']

export function confirmDeleteParentTask(options: {
  t: TFn
  taskTitle: string
  childCount: number
}): Promise<DeleteTaskMode | null> {
  const { t, taskTitle, childCount } = options
  if (childCount <= 0) return Promise.resolve('promote')

  return new Promise((resolve) => {
    const modal = Modal.confirm({
      title: t('task.deleteParentTitle'),
      icon: null,
      closable: true,
      maskClosable: false,
      autoFocusButton: null,
      content: (
        <div>
          <Typography.Paragraph>
            {t('task.deleteParentBody', { title: taskTitle, count: childCount })}
          </Typography.Paragraph>
          <Typography.Text type="secondary">{t('task.deleteParentHint')}</Typography.Text>
        </div>
      ),
      okCancel: false,
      footer: (_, { CancelBtn }) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <CancelBtn />
          <button
            type="button"
            className="ant-btn"
            onClick={() => {
              modal.destroy()
              resolve('promote')
            }}
          >
            {t('task.deletePromote')}
          </button>
          <button
            type="button"
            className="ant-btn ant-btn-dangerous"
            onClick={() => {
              modal.destroy()
              resolve('cascade')
            }}
          >
            {t('task.deleteCascade')}
          </button>
        </div>
      ),
      onCancel: () => resolve(null)
    })
  })
}

export function countTaskDescendants(
  tasks: { taskId: string; parentTaskId?: string }[],
  rootId: string
): number {
  const byParent = new Map<string, string[]>()
  for (const t of tasks) {
    if (!t.parentTaskId) continue
    const list = byParent.get(t.parentTaskId) ?? []
    list.push(t.taskId)
    byParent.set(t.parentTaskId, list)
  }
  let count = 0
  const stack = [...(byParent.get(rootId) ?? [])]
  while (stack.length) {
    const id = stack.pop()!
    count += 1
    stack.push(...(byParent.get(id) ?? []))
  }
  return count
}
