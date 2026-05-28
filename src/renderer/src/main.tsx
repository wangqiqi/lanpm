import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import App from './App'
import './styles/global.module.css'

const prefersDark =
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
const savedTheme = localStorage.getItem('theme')
const isDark = savedTheme === 'dark' || (savedTheme !== 'light' && prefersDark)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: { borderRadius: 8 }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
