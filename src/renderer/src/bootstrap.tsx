import React from 'react'
import ReactDOM from 'react-dom/client'
import 'antd/dist/reset.css'
import App from './App'
import RootErrorBoundary from './app/RootErrorBoundary'
import ThemeProvider from './app/ThemeProvider'
import './styles/global.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('#root 不存在')
}

const tree = (
  <RootErrorBoundary>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </RootErrorBoundary>
)

ReactDOM.createRoot(rootEl).render(
  import.meta.env.DEV ? tree : <React.StrictMode>{tree}</React.StrictMode>
)
