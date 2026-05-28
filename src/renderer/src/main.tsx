import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import ThemeProvider from './app/ThemeProvider'
import './styles/global.module.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
