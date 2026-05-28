import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ThemeProvider from './app/ThemeProvider'
import { installLanpmBridge } from '@renderer/platform/installLanpmBridge'
import './styles/global.module.css'

installLanpmBridge()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
