import styles from './ViewToolbar.module.css'

interface ViewToolbarProps {
  start?: React.ReactNode
  end?: React.ReactNode
  children?: React.ReactNode
}

/** 看板 / 树 / 甘特 / 文件统一工具栏行 */
export default function ViewToolbar({ start, end, children }: ViewToolbarProps): React.ReactElement {
  if (children) {
    return <div className={styles.toolbar}>{children}</div>
  }
  return (
    <div className={styles.toolbar}>
      {start ? <div className={styles.group}>{start}</div> : <span />}
      {end ? <div className={styles.group}>{end}</div> : null}
    </div>
  )
}

export function ViewToolbarGroup({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className={styles.group}>{children}</div>
}

/** 工具栏内「输入框 + 操作按钮」成对分组，避免 flex 换行时按钮与输入框分离 */
export function ViewToolbarPair({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className={styles.pair}>{children}</div>
}

export function ViewToolbarHint({ children }: { children: React.ReactNode }): React.ReactElement {
  return <span className={styles.hint}>{children}</span>
}
