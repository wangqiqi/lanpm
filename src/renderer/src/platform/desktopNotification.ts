import notificationIconUrl from '@resources/icon.png'

/** 桌面通知统一入口（须带品牌 icon，避免回落 Electron 默认标） */
export function showDesktopNotification(title: string, body: string): void {
  if (typeof Notification === 'undefined') return

  const fire = (): void => {
    new Notification(title, { body, icon: notificationIconUrl })
  }

  if (Notification.permission === 'granted') {
    fire()
  } else if (Notification.permission !== 'denied') {
    void Notification.requestPermission().then((p) => {
      if (p === 'granted') fire()
    })
  }
}
