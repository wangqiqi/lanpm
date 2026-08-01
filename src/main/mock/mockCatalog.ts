import type { TaskPriority, TaskStatus } from '../../shared/task/types'
import type { TaskDependencyType } from '../../shared/task/dependency'
import type { MessageContent } from '../../shared/chat/types'

export const MOCK_CATALOG_META_KEY = 'mock_catalog_version'

/** seed 时替换为当前登录用户 */
export const MOCK_OWNER_SENDER = '__owner__'

export interface MockUserDef {
  userId: string
  displayName: string
  baseName: string
}

export const MOCK_PEER_USERS: MockUserDef[] = [
  { userId: 'demo-alice', displayName: 'Alice', baseName: 'Alice' },
  { userId: 'demo-bob', displayName: 'Bob', baseName: 'Bob' },
  { userId: 'demo-carol', displayName: 'Carol', baseName: 'Carol' }
]

export interface MockTaskDef {
  title: string
  status: TaskStatus
  priority: TaskPriority
  progressPercent: number
  sortOrder: number
  startOffsetDays: number
  endOffsetDays: number
  milestone?: boolean
  assigneeUserId?: string
  parentTitle?: string
  description?: string
  otherReason?: string
}

export interface MockTaskDepDef {
  fromTitle: string
  toTitle: string
  type: TaskDependencyType
}

export interface MockMessageDef {
  senderUserId: string
  type: 'text' | 'code' | 'task_ref'
  content: MessageContent
  minutesAgo: number
}

export interface MockBookmarkDef {
  title: string
  url: string
}

/** 聊天中自动插入任务卡片时按标题匹配 */
export const MOCK_TASK_REF_TITLES = [
  '看板拖拽与任务树联动',
  '甘特图排期调整',
  '文件预览与聊天反向链接',
  'M1 · 协作体验'
]

export const MOCK_PROJECT_TASKS: MockTaskDef[] = [
  {
    title: 'M1 · 协作体验',
    status: 'doing',
    priority: 'high',
    progressPercent: 45,
    sortOrder: 0,
    startOffsetDays: -10,
    endOffsetDays: 14,
    milestone: true,
    description: '演示看板、任务树、甘特三视图联动；可在各视图间切换体验同一批任务。'
  },
  {
    title: '看板拖拽与任务树联动',
    status: 'doing',
    priority: 'high',
    progressPercent: 55,
    sortOrder: 0,
    startOffsetDays: -3,
    endOffsetDays: 7,
    assigneeUserId: 'demo-bob',
    parentTitle: 'M1 · 协作体验',
    description: '在看板列之间拖拽卡片，或在任务树调整父子关系，进度会自动汇总。'
  },
  {
    title: '接口文档补全',
    status: 'other',
    priority: 'medium',
    progressPercent: 10,
    sortOrder: 1,
    startOffsetDays: -1,
    endOffsetDays: 5,
    assigneeUserId: 'demo-alice',
    parentTitle: 'M1 · 协作体验',
    otherReason: '等待设计稿定稿后再继续',
    description: '「其他」状态可填写阻塞原因，便于团队同步。'
  },
  {
    title: '甘特图排期调整',
    status: 'doing',
    priority: 'medium',
    progressPercent: 30,
    sortOrder: 2,
    startOffsetDays: 0,
    endOffsetDays: 14,
    milestone: true,
    parentTitle: 'M1 · 协作体验',
    description: '在甘特页拖动条形图改日期；带里程碑的任务会以节点形式突出显示。'
  },
  {
    title: 'M2 · 发布准备',
    status: 'todo',
    priority: 'high',
    progressPercent: 0,
    sortOrder: 0,
    startOffsetDays: 3,
    endOffsetDays: 28,
    description: '发布前联调、走查与自动化；适合在树视图展开子任务逐条跟进。'
  },
  {
    title: '文件预览与聊天反向链接',
    status: 'todo',
    priority: 'high',
    progressPercent: 0,
    sortOrder: 0,
    startOffsetDays: 2,
    endOffsetDays: 10,
    assigneeUserId: 'demo-carol',
    parentTitle: 'M2 · 发布准备',
    description: '文件页上传后可「发送到群聊」；聊天里的文件卡片可跳回文件页预览。'
  },
  {
    title: '编写联调清单',
    status: 'todo',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 1,
    startOffsetDays: 5,
    endOffsetDays: 18,
    assigneeUserId: 'demo-bob',
    parentTitle: 'M2 · 发布准备'
  },
  {
    title: 'UI 走查与截图基线',
    status: 'todo',
    priority: 'low',
    progressPercent: 0,
    sortOrder: 2,
    startOffsetDays: 8,
    endOffsetDays: 21,
    parentTitle: 'M2 · 发布准备'
  },
  {
    title: 'E2E 自动化用例',
    status: 'todo',
    priority: 'medium',
    progressPercent: 0,
    sortOrder: 3,
    startOffsetDays: 10,
    endOffsetDays: 25,
    assigneeUserId: 'demo-alice',
    parentTitle: 'M2 · 发布准备'
  },
  {
    title: '需求评审 · 登录与多账号',
    status: 'done',
    priority: 'high',
    progressPercent: 100,
    sortOrder: 0,
    startOffsetDays: -14,
    endOffsetDays: -7,
    assigneeUserId: 'demo-alice',
    description: 'Profile 目录隔离多账号数据；可在顶栏用户菜单查看设备与 IP。'
  },
  {
    title: '身份与 Profile 迁移',
    status: 'done',
    priority: 'high',
    progressPercent: 100,
    sortOrder: 1,
    startOffsetDays: -12,
    endOffsetDays: -5,
    assigneeUserId: 'demo-bob'
  },
  {
    title: '局域网发现与加群',
    status: 'done',
    priority: 'medium',
    progressPercent: 100,
    sortOrder: 2,
    startOffsetDays: -8,
    endOffsetDays: -2,
    assigneeUserId: 'demo-carol',
    description: '顶栏「发现」可浏览局域网群组；也可手动添加节点 IP。'
  },
  {
    title: '回归测试 · RC',
    status: 'done',
    priority: 'medium',
    progressPercent: 100,
    sortOrder: 3,
    startOffsetDays: -21,
    endOffsetDays: -14,
    assigneeUserId: 'demo-bob'
  },
  {
    title: '驾驶舱周报生成',
    status: 'done',
    priority: 'low',
    progressPercent: 100,
    sortOrder: 4,
    startOffsetDays: -6,
    endOffsetDays: -1,
    description: '进入顶栏「驾驶舱」可汇总各项目群进度并生成 AI 周报/月报。'
  }
]

export const MOCK_PROJECT_TASK_DEPS: MockTaskDepDef[] = [
  { fromTitle: '需求评审 · 登录与多账号', toTitle: '看板拖拽与任务树联动', type: 'FS' },
  { fromTitle: '看板拖拽与任务树联动', toTitle: '甘特图排期调整', type: 'FS' },
  { fromTitle: '甘特图排期调整', toTitle: '文件预览与聊天反向链接', type: 'FS' },
  { fromTitle: '文件预览与聊天反向链接', toTitle: '编写联调清单', type: 'FS' },
  { fromTitle: '编写联调清单', toTitle: 'UI 走查与截图基线', type: 'FS' },
  { fromTitle: 'UI 走查与截图基线', toTitle: 'E2E 自动化用例', type: 'FS' },
  { fromTitle: 'E2E 自动化用例', toTitle: '回归测试 · RC', type: 'FS' }
]

export const MOCK_PROJECT_MESSAGES: MockMessageDef[] = [
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '👋 欢迎！这是「示例项目 · LanPM」——建议按这个顺序快速熟悉产品：\n1️⃣ 聊天（@成员、代码块、任务/文件卡片）\n2️⃣ 看板拖拽列\n3️⃣ 任务树展开 M1/M2\n4️⃣ 甘特图拖日期\n5️⃣ 文件页书签与预览\n6️⃣ 顶栏驾驶舱汇总进度'
    },
    minutesAgo: 720
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '收到！我先在看板把「看板拖拽与任务树联动」拖到进行中，@Bob 麻烦同步树视图里的子任务。'
    },
    minutesAgo: 680
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '树视图已更新。父任务进度会随子任务自动汇总——你可以点开 M1 下的「接口文档补全」看「其他」状态和阻塞原因。'
    },
    minutesAgo: 650
  },
  {
    senderUserId: 'demo-carol',
    type: 'text',
    content: {
      kind: 'text',
      text: '甘特里我把「甘特图排期调整」标成里程碑了，依赖线连到文件预览任务，方便排期演示。'
    },
    minutesAgo: 520
  },
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '小提示：底部导航默认在 聊天 / 看板 / 树 / 甘特 / 日历 间切换；文件库、白板、脑图可从聊天输入框旁的工具栏打开。职能群和匿名群会隐藏部分 Tab。'
    },
    minutesAgo: 480
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '文件预览修复已合入。在文件页选中文档后点「发送到群聊」，聊天里会出现文件卡片并可跳回预览。'
    },
    minutesAgo: 360
  },
  {
    senderUserId: 'demo-bob',
    type: 'code',
    content: {
      kind: 'code',
      language: 'typescript',
      code: '// 演示代码块消息\nexport function pickDefaultGroupId(groups: GroupRecord[]) {\n  const real = groups.find((g) => !g.groupId.startsWith("demo-"))\n  return real?.groupId ?? groups[0]?.groupId\n}',
      theme: 'dark'
    },
    minutesAgo: 300
  },
  {
    senderUserId: 'demo-carol',
    type: 'code',
    content: {
      kind: 'code',
      language: 'bash',
      code: '# 本地启动开发\nnpm run dev\n# 发布前静态门禁\nnpm run verify:p0',
      theme: 'dark'
    },
    minutesAgo: 240
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '我把文档导航和设计规范书签放在文件页了，稍后在聊天里分享链接卡片。'
    },
    minutesAgo: 180
  },
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '顶栏「发现」可以加入局域网里的其他群组；「创建群组」支持项目 / 职能 / 匿名三种类型。你是本群群主，可用「解散群组」清空演示数据（重启后会恢复）。'
    },
    minutesAgo: 120
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '驾驶舱里跑一遍周报吧，项目进度卡片会读这些任务的完成/延期统计。'
    },
    minutesAgo: 90
  },
  {
    senderUserId: 'demo-carol',
    type: 'text',
    content: {
      kind: 'text',
      text: '全局搜索（顶栏放大镜）可以跨任务、消息、成员检索，适合大群找历史讨论。'
    },
    minutesAgo: 60
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '网络状态圆点：绿色在线、灰色离线；点一下可刷新或手动添加节点 IP。'
    },
    minutesAgo: 45
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '今天先把联调清单补全，周五走查前我们再对一遍 P0 用例。'
    },
    minutesAgo: 25
  },
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '下方还有几条任务卡片消息，点击可跳到对应任务详情。祝体验愉快！'
    },
    minutesAgo: 10
  }
]

export const MOCK_FUNCTION_MESSAGES: MockMessageDef[] = [
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '📌 职能群说明：适合放规范、Wiki、值班表等跨项目资料。底部只有「聊天」和「文件」，没有看板/树/甘特。'
    },
    minutesAgo: 480
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '设计规范、组件库、API 约定这类长期有效的文档，建议以书签形式放在文件页。'
    },
    minutesAgo: 420
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '需要同步全员的通知直接发聊天；重要链接也可以「发送到群聊」变成文件卡片。'
    },
    minutesAgo: 360
  },
  {
    senderUserId: 'demo-carol',
    type: 'text',
    content: {
      kind: 'text',
      text: '本周值班：Alice 周一至周三，Bob 周四周五，我负责周末 on-call。'
    },
    minutesAgo: 300
  },
  {
    senderUserId: 'demo-alice',
    type: 'code',
    content: {
      kind: 'code',
      language: 'markdown',
      code: '## 代码评审 Checklist\n- [ ] 类型安全 / 无 any\n- [ ] IPC 契约与 preload 一致\n- [ ] 新增文案走 i18n\n- [ ] verify:p0 通过',
      theme: 'light'
    },
    minutesAgo: 240
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '周五例会改到 15:00，议题：RC 门禁、视觉抽检、文档与代码一致性 audit。'
    },
    minutesAgo: 180
  },
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '职能群同样支持 @成员 与已读回执；可与项目群并行使用，避免项目群里杂讯过多。'
    },
    minutesAgo: 120
  },
  {
    senderUserId: 'demo-carol',
    type: 'text',
    content: {
      kind: 'text',
      text: '新人 onboarding：先看示例项目群熟悉五视图，再回到职能群查规范和流程。'
    },
    minutesAgo: 90
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '安全提醒：API Key 请在驾驶舱配置，勿粘贴到群聊；敏感文件走局域网同步。'
    },
    minutesAgo: 60
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '收到。我把团队 Wiki 和发布 Checklist 书签更新到文件页了。'
    },
    minutesAgo: 30
  }
]

export const MOCK_ANONYMOUS_MESSAGES: MockMessageDef[] = [
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '🔒 匿名群说明：消息仅保存在内存，离开或切换群组后清空；适合临时脑暴、不便留痕的讨论。'
    },
    minutesAgo: 120
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '这里只支持纯文本聊天，不能发文件、任务，也没有看板/甘特/文件 Tab。'
    },
    minutesAgo: 110
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '成员显示为「访客1 / 访客2 / 访客3」别名，保护真实身份；@提及 仍可使用。'
    },
    minutesAgo: 95
  },
  {
    senderUserId: 'demo-carol',
    type: 'text',
    content: {
      kind: 'text',
      text: '切换去其他群时会提示「离开匿名群？」——确认后会结束当前匿名会话。'
    },
    minutesAgo: 80
  },
  {
    senderUserId: MOCK_OWNER_SENDER,
    type: 'text',
    content: {
      kind: 'text',
      text: '演示：大家可以在这里自由讨论，无需担心历史堆积；重启应用后演示消息会重新注入。'
    },
    minutesAgo: 65
  },
  {
    senderUserId: 'demo-alice',
    type: 'text',
    content: {
      kind: 'text',
      text: '测试 @访客2 的提及高亮是否正常显示。'
    },
    minutesAgo: 50
  },
  {
    senderUserId: 'demo-bob',
    type: 'text',
    content: {
      kind: 'text',
      text: '匿名群同样走局域网同步协议，只是不落库；适合跨部门快速对齐。'
    },
    minutesAgo: 35
  },
  {
    senderUserId: 'demo-carol',
    type: 'text',
    content: {
      kind: 'text',
      text: '讨论结束后切回「示例项目」继续跟进任务即可。'
    },
    minutesAgo: 15
  }
]

export const MOCK_PROJECT_BOOKMARKS: MockBookmarkDef[] = [
  { title: 'LanPM 文档导航（docs/00）', url: 'https://github.com/' },
  { title: '产品需求 PRD · 01', url: 'https://example.com/docs/01-prd' },
  { title: '设计规范 Figma', url: 'https://www.figma.com/' },
  { title: 'verify:p0 门禁说明', url: 'https://example.com/docs/verify-p0' },
  { title: '联调环境 · staging', url: 'https://example.com/staging' },
  { title: 'Issue 跟踪', url: 'https://example.com/issues' }
]

export const MOCK_FUNCTION_BOOKMARKS: MockBookmarkDef[] = [
  { title: '团队 Wiki 首页', url: 'https://example.com/wiki' },
  { title: '值班表 · 2026 Q2', url: 'https://example.com/oncall' },
  { title: '发布 Checklist', url: 'https://example.com/release-checklist' },
  { title: '组件库 Storybook', url: 'https://example.com/storybook' },
  { title: 'API 约定 · REST', url: 'https://example.com/api-guidelines' },
  { title: '安全与密钥管理', url: 'https://example.com/security' }
]
