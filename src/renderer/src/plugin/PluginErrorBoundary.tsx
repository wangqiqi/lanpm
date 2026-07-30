import { Component, type ErrorInfo, type ReactNode } from 'react'
import { translate, type LocaleId } from '@renderer/i18n/messages'
import styles from './plugin.module.css'

interface Props {
  pluginId: string
  children: ReactNode
}

interface State {
  error: Error | null
}

/** 单插件失败隔离，不拖垮任务详情 */
export default class PluginErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(`[lanpm] plugin ${this.props.pluginId} crashed:`, error, info.componentStack)
  }

  render(): ReactNode {
    if (this.state.error) {
      const locale = (localStorage.getItem('locale') as LocaleId | null) ?? 'zh-CN'
      const t = (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
        translate(locale, key, params)
      return (
        <div className={styles.crash} role="alert" data-plugin-crash={this.props.pluginId}>
          <div>{t('plugin.crashTitle', { pluginId: this.props.pluginId })}</div>
          <pre className={styles.crashDetail}>{this.state.error.message}</pre>
        </div>
      )
    }
    return this.props.children
  }
}
