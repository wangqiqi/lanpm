export type LocaleId = 'zh-CN' | 'en-US'

export type MessageKey =
  | 'topbar.logo'
  | 'topbar.cockpit'
  | 'topbar.searchPlaceholder'
  | 'topbar.toggleTheme'
  | 'topbar.userFallback'
  | 'topbar.profile'
  | 'topbar.device'
  | 'topbar.apiKey'
  | 'groupType.project'
  | 'groupType.function'
  | 'groupType.anonymous'
  | 'nav.chat'
  | 'nav.board'
  | 'nav.tree'
  | 'nav.gantt'
  | 'nav.files'
  | 'nav.disabled.project'
  | 'nav.disabled.function'
  | 'nav.disabled.anonymous'

const zhCN: Record<MessageKey, string> = {
  'topbar.logo': 'LanPM',
  'topbar.cockpit': '驾驶舱',
  'topbar.searchPlaceholder': '搜索任务、消息…',
  'topbar.toggleTheme': '切换主题',
  'topbar.userFallback': '用户',
  'topbar.profile': '个人设置（占位）',
  'topbar.device': '设备',
  'topbar.apiKey': 'API Key（M5）',
  'groupType.project': '项目',
  'groupType.function': '职能',
  'groupType.anonymous': '匿名',
  'nav.chat': '聊天',
  'nav.board': '看板',
  'nav.tree': '任务树',
  'nav.gantt': '甘特图',
  'nav.files': '文件',
  'nav.disabled.project': '仅项目群组支持',
  'nav.disabled.function': '职能群仅支持聊天与文件',
  'nav.disabled.anonymous': '匿名群仅支持聊天'
}

const enUS: Record<MessageKey, string> = {
  'topbar.logo': 'LanPM',
  'topbar.cockpit': 'Cockpit',
  'topbar.searchPlaceholder': 'Search tasks, messages…',
  'topbar.toggleTheme': 'Toggle theme',
  'topbar.userFallback': 'User',
  'topbar.profile': 'Profile (placeholder)',
  'topbar.device': 'Device',
  'topbar.apiKey': 'API Key (M5)',
  'groupType.project': 'Project',
  'groupType.function': 'Function',
  'groupType.anonymous': 'Anonymous',
  'nav.chat': 'Chat',
  'nav.board': 'Board',
  'nav.tree': 'Tree',
  'nav.gantt': 'Gantt',
  'nav.files': 'Files',
  'nav.disabled.project': 'Project groups only',
  'nav.disabled.function': 'Function groups: chat and files only',
  'nav.disabled.anonymous': 'Anonymous groups: chat only'
}

export const MESSAGES: Record<LocaleId, Record<MessageKey, string>> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

export function translate(locale: LocaleId, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES['zh-CN'][key] ?? key
}
