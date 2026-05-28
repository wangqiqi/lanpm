import type { MessageKey } from '@renderer/i18n/messages'

const enUS = {
  'topbar.logo': 'LanPM',
  'topbar.cockpit': 'Cockpit',
  'topbar.searchPlaceholder': 'Search tasks, messages…',
  'search.kindTask': 'Task',
  'search.kindMessage': 'Message',
  'search.loading': 'Searching…',
  'search.empty': 'No results',
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
} satisfies Record<MessageKey, string>

export default enUS
