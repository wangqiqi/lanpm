/** 浏览器/Cursor 预览：installLanpmBridge 注入的 development stub（非 Electron preload） */
export function isBrowserPreview(): boolean {
  return (
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.lanpm?.platform === 'browser'
  )
}
