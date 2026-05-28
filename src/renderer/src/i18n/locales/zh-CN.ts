import type { MessageKey } from '@renderer/i18n/messages'

const zhCN = {
  'topbar.logo': 'LanPM',
  'topbar.cockpit': '驾驶舱',
  'topbar.searchPlaceholder': '搜索任务、消息…',
  'search.kindTask': '任务',
  'search.kindMessage': '消息',
  'search.loading': '搜索中…',
  'search.empty': '无匹配结果',
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
} satisfies Record<MessageKey, string>

export default zhCN
