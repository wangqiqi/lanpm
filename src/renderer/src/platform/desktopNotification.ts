import { getLanpmApi } from './installLanpmBridge'

/** 桌面通知：Electron 走主进程（Windows 品牌 icon + 标题）；浏览器用 Web Notification */
export function showDesktopNotification(title: string, body: string): void {
  const api = getLanpmApi()
  if (api.platform !== 'browser' && api.notification) {
    void api.notification.show(title, body)
    return
  }

  if (typeof Notification === 'undefined') return

  const fire = (): void => {
    new Notification(title, { body })
  }

  if (Notification.permission === 'granted') {
    fire()
  } else if (Notification.permission !== 'denied') {
    void Notification.requestPermission().then((p) => {
      if (p === 'granted') fire()
    })
  }
}
