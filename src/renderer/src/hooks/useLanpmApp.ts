import { App } from 'antd'

/** 须在 ThemeProvider 内 antd App 子树中调用，以正确消费 ConfigProvider 主题 */
export function useLanpmApp(): ReturnType<typeof App.useApp> {
  return App.useApp()
}
