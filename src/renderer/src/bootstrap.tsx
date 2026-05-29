import React from 'react'
import ReactDOM from 'react-dom/client'
import 'antd/dist/reset.css'
import App from './App'
import RootErrorBoundary from './app/RootErrorBoundary'
import ThemeProvider from './app/ThemeProvider'
import './styles/global.module.css'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('#root 不存在')
}

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </RootErrorBoundary>
  </React.StrictMode>
)
