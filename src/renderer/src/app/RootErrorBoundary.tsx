import { Component, type ErrorInfo, type ReactNode } from 'react'

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
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            background: '#f5f5f7',
            color: '#1d1d1f'
          }}
        >
          <h1 style={{ margin: 0, fontSize: 18 }}>LanPM 页面加载失败</h1>
          <pre
            style={{
              maxWidth: 720,
              overflow: 'auto',
              padding: 12,
              borderRadius: 8,
              background: '#fff',
              border: '1px solid rgba(60,60,67,0.18)',
              fontSize: 13,
              whiteSpace: 'pre-wrap'
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: 'none',
              background: '#0071e3',
              color: '#fff',
              cursor: 'pointer'
            }}
          >
            重新加载
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
