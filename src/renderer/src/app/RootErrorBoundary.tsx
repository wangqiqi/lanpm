import { Component, type ErrorInfo, type ReactNode } from 'react'
import { translate, type LocaleId } from '@renderer/i18n/messages'
import styles from './crash.module.css'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** 捕获启动期渲染错误，避免浏览器/Cursor 预览白屏无提示 */
export default class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[lanpm] renderer crash:', error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      const locale = (localStorage.getItem('locale') as LocaleId | null) ?? 'zh-CN'
      const t = (key: Parameters<typeof translate>[1]) => translate(locale, key)
      return (
        <div className={styles.shell}>
          <h1 className={styles.title}>{t('app.crashTitle')}</h1>
          <pre className={styles.detail}>{this.state.error.message}</pre>
          <button type="button" className={styles.reload} onClick={() => window.location.reload()}>
            {t('app.crashReload')}
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
