# LanPM Todo

> **唯一任务真源（SSOT）**：本文件。根目录不再保留 `plan.md` / `ui.md` / `ux.md` / `评估.md`；审查原文在 `archive/`，新增、勾选、排期**只改本文件**。  
> **当前版本**：`1.0.0-rc.11` · M0–M7 已归档（`1.0.0-rc.1`）  
> **计划概述（只读）**：[archive/20260529_095839_plan概述_SSOT后归档.md](./archive/20260529_095839_plan概述_SSOT后归档.md)

### 来源追溯（审查归档 → todo ID）

| 归档原文 | todo 章节 / ID 前缀 |
|----------|---------------------|
| [plan 概述](./archive/20260529_095839_plan概述_SSOT后归档.md) | §RC、§v1.1、§视觉 V-*、§i18n I18N-* |
| [UI 审查](./archive/20260529_095839_UI设计审查_ui.md) | §UI/UX — UX-F / UX-I / UX-A / UX-V / UX-R / UX-N |
| [UX 审查](./archive/20260529_095839_UX操作路径审查_ux.md) | §UX 操作路径 — UX-X / UX-W / UX-PATH / UX-FLOW / UX-DEV |
| [评估](./archive/20260529_095839_实现文档一致性评估_评估.md) | §DOC-*、§PRD-F-*、§ARCH-*、§P1 backlog |

| 文档 | 说明 |
|------|------|
| [archive/20260528_234920_M7完成_todo执行清单归档.md](./archive/20260528_234920_M7完成_todo执行清单归档.md) | M0–M7 任务清单（56 项，全部 `[x]`） |
| [docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md) | RC 手验与已知限制 |
| [docs/09_视觉手验清单.md](./docs/09_视觉手验清单.md) | V-14b 亮/暗七页手验 |
| [archive/20260529_095839_实现文档一致性评估_评估.md](./archive/20260529_095839_实现文档一致性评估_评估.md) | 实现与文档一致性审查（2026-05-29） |
| [archive/20260529_095839_UI设计审查_ui.md](./archive/20260529_095839_UI设计审查_ui.md) | UI/UX 设计审查（2026-05-29） |
| [archive/20260529_095839_UX操作路径审查_ux.md](./archive/20260529_095839_UX操作路径审查_ux.md) | 操作路径与交互闭环审查（2026-05-29） |
| [archive/20260529_095839_plan概述_SSOT后归档.md](./archive/20260529_095839_plan概述_SSOT后归档.md) | 执行计划概述（自根目录迁出） |
| [archive/20260529_093804_plan详细章节迁todo后归档.md](./archive/20260529_093804_plan详细章节迁todo后归档.md) | WBS/验收/风险章节 |

---

## RC → 正式版（手验）

- [ ] 三平台冒烟（Win / macOS / Linux）
- [x] Linux 自动化回归：`npm run verify:m7`（含 visual / search，2026-05-28 本机）
- [x] Linux 项目检查：`npm run verify:project` + `npm run build` + ESLint 全绿
- [ ] 性能手测填表（docs/06 §3：冷启动 / 内存 / Tab P95）
- [ ] 局域网双机真网联调（docs/06 §4）
- [ ] 回填 `docs/08` §16.11 性能表（手验后）
- [ ] 发布 **`1.0.0`**

---

## v1.1+ backlog

- [x] 顶栏全局搜索（任务 + 消息）（`search:query` + `GlobalSearch` + `verify:search`）
- [x] 看板删除任务 UI（`task:deleteTask` 软删除 + `KanbanCard` Popconfirm）
- [ ] **B-01** 任务 P2P / Yjs 同步（评估 §3.1；`docs/08` post-RC）
- [ ] **B-02** 远端文件 P2P 下载（评估 §3.1、`03` §16.7）
- [ ] **B-03** 看板列内 Sortable 排序（`@dnd-kit/sortable`；评估 §4.2）
- [ ] **B-04** WebRTC DataChannel 消息/文件通道（或决策维持 TCP + 更新 `docs/01`/`08`，与 **ARCH-06** 联动）

### P1 — PRD 后续（评估 §4.2，非 RC 阻断）

- [ ] **P1-R-06** 顶栏全局搜索扩展**成员**（`01` §5.2 P1；`searchService` + UI）
- [ ] **P1-CHAT-01** 聊天**表情**（`03` §15.1 P1）
- [ ] **P1-FILES-01** 书签**导入/导出**增强（`03` §15.1 P1；toolbar 已有基础能力时补全 PRD 条款）

---

## 视觉一致性（v1.0.x，2026-05-28 审计）

> 原则摘要见 [plan 概述归档](./archive/20260529_095839_plan概述_SSOT后归档.md) · 手验 [docs/09](./docs/09_视觉手验清单.md)

### P0 — 设计令牌与暗色

- [x] **V-01** `global.module.css` 补全 `--lanpm-border` / bubble / code / accent 变量
- [x] **V-02** 模块 CSS 强调色改 `var(--lanpm-accent*)`
- [x] **V-03** `TaskTreeView` 空状态改用 `ViewEmptyHint`

### P1 — 布局与页级结构

- [x] **V-04** `ViewHeader` 统一页标题 level 4
- [x] **V-05** `MainLayout` 主区内边距 16px
- [x] **V-06** TopBar 56px、BottomNav 64px
- [x] **V-07** 驾驶舱去掉 `max-width` 窄栏

### P2 — 模块内模式统一

- [x] **V-08** `ViewToolbar` / `ViewToolbarGroup`
- [x] **V-09** `ViewLoadingCenter` / `ViewEmptyHint`
- [x] **V-10** 甘特 `todayColor` + 暗色 `.chartWrap`
- [x] **V-11** 页标题语义落 `docs/05` §1.1

### P3 — 清理与文档

- [x] **V-12** 删除遗留 `features/shell/*`、`features/views/*` 等
- [x] **V-13** 更新 `docs/05` §1
- [x] **V-14a** `npm run verify:visual`（已纳入 `verify:m7`）
- [ ] **V-14b** 亮/暗手验截图（[docs/09](./docs/09_视觉手验清单.md)）

---

## 全量 i18n（v1.0.x，2026-05-29）

- [x] **I18N-01** `locales/zh-CN.ts` + `en-US.ts`，232 键
- [x] **I18N-02** 壳层 + 群组页 + 驾驶舱 + 看板/树/甘特/文件
- [x] **I18N-03** 聊天 + 成员/私聊 + 弹窗 + Setup 向导
- [x] **I18N-04** `translate` 插值 + `verify:topbar` 键 parity
- [ ] **I18N-05** 手验：顶栏切 English，七页 + 驾驶舱 + Setup 全英文
- [ ] **I18N-06**（可选）主进程/Stub 错误消息与 demo 数据名 i18n

---

## UX 操作路径与闭环（来源：[UX 审查归档](./archive/20260529_095839_UX操作路径审查_ux.md)）

> 与 [UI 审查归档](./archive/20260529_095839_UI设计审查_ui.md) 互补；断环 **UX-X-*** 优先。与 **UX-F-*** 等同 ID 的条目合并实现即可。

### P0 — 断环 / 丢数据（UX 审查 §4.2、§9）

- [x] **UX-X-01** 搜索 → 定位：各视图消费 `highlightTaskId` / `highlightMsgId`，scrollIntoView + 临时高亮 — 同 **UX-F-01** / **PRD-F-05**
- [x] **UX-X-02** 发纯文本：`await sendText` 成功后再 `setDraft('')`；失败 `message.error` 并恢复 draft（`ChatView` L184-185）
- [x] **UX-X-03** 驾驶舱加载失败：错误页 + 重试，禁止全 0 假数据 — 同 **UX-F-03** / **UX-V-07**
- [x] **UX-X-04** App 身份 `getSetupStatus` 失败：错误页/重试，区分未配置 vs 服务不可用 — 同 **UX-F-04**
- [x] **UX-X-05** 全局搜索 API 失败：toast 或错误态，与「无结果」区分 — 同 **UX-F-05**
- [x] **UX-X-06** TopBar「个人设置」：实现或移除 disabled 死胡同 — 同 **UX-F-06** / **PRD-F-08**
- [x] **UX-X-07** DM 会话时 TopBar：`dm:*` 在 Select 中显示「私聊：{name}」option 或只读 Badge（`TopBar` + `navigationStore`）
- [x] **UX-X-08** 任务树：选中含子节点任务时改进度，展示不可编辑说明（`TaskTreeView` L90-96）

### P1 — 弱闭环（UX 审查 §4.3、§3）

- [x] **UX-W-01** 创建群组失败 toast — 同 **UX-F-14**
- [x] **UX-W-02** 发代码 / AI 配置保存失败 toast（`CodeSendModal`、`AiConfigModal` 补 catch）
- [x] **UX-W-03** `markRead` 失败非静默（toast 或重试）
- [x] **UX-W-04** `loadMessages` / `loadGroups` 失败错误 UI（`ChatView`、群列表等）
- [x] **UX-W-05** 驾驶舱离开：「返回上次群」或 Logo 回 `lastNonCockpitPath` — 同 **UX-N-01** / **UX-PATH-01**
- [x] **UX-W-06** 匿名群：`enterAnonymous` / `leaveAnonymous` 进入说明或离开确认 + toast
- [x] **UX-W-07** 非法 Hash 视图：`GroupViewGuard` redirect 时 toast — 同 **UX-N-02**
- [x] **UX-W-08** 甘特里程碑：双击切换的 discoverability（toolbar 提示或 Tooltip）
- [x] **UX-W-09** 启动/Setup 后默认路由：首个真实群或刚创建群，非 `demo-project` — 同 **UX-F-15** / **UX-PATH-06**
- [x] **UX-W-10** 聊天消息加载失败态，与空消息列表区分 — 可随 **UX-W-04** 一并做

### P2 — 最短路径优化（UX 审查 §5.2、§9）

- [x] **UX-PATH-01** 驾驶舱 → 继续协作：1 步回到上次群/视图 — 同 **UX-W-05**
- [x] **UX-PATH-02** 用户菜单「API Key」直接打开 `AiConfigModal`（免先跳驾驶舱）
- [x] **UX-PATH-03** 看板 toolbar inline 快速建任务（对齐任务树输入 + 按钮）
- [x] **UX-PATH-04**（可选）任务树：行内 slider / 双击改进度（`TaskTreeView` 双击进度条）
- [x] **UX-PATH-05** DM 中点击 Logo：回 `lastOriginGroupId` 项目群（`TopBar`）
- [x] **UX-PATH-06** Setup 完成后进入首个真实群 — 同 **UX-W-09**
- [x] **UX-PATH-07** 匿名群进入时简要能力说明（仅聊天、无历史等）

### P3 — 跨视图协作链（UX 审查 §8）

- [x] **UX-FLOW-01** 看板任务 →「在聊天中讨论 / 提及任务」反向链（`KanbanCard` → `composeDraft`）
- [x] **UX-FLOW-02** 文件 →「发送到群聊」（`FilesView` → `composeDraft`）
- [x] **UX-FLOW-03** 甘特任务 ↔ 看板卡片互跳（单击甘特条 → 看板高亮）

### 其他（UX 审查 §3、§7）

- [x] **UX-DEV-01**（可选）浏览器 `:5173` stub 与 Electron 行为差异 — `README` §浏览器 Stub

---

## 文档与版本对齐（来源：[评估归档](./archive/20260529_095839_实现文档一致性评估_评估.md) §2、§7、§9）

- [x] **DOC-01** 统一 `README.md`、`docs/08` 文首、README 中 RC 号为当前 `package.json` 版本
- [x] **DOC-02** 在 `docs/01` §1.3 增加「RC 实现现状」子表（或指向 `docs/08`），区分目标栈与已落地栈
- [x] **DOC-03** 将 `docs/03` §16.11「7 天离线补同步」改为 P1/post-RC，或与 **ARCH-07** 合并排期
- [x] **DOC-04** `README` 技术选型改为「目标架构 / 当前 RC 实现」分栏（同 **ARCH-06**）
- [x] **DOC-05** 统一对外表述：「RC 自动化回归通过」≠「PRD P0 100%」≠「1.0.0 门禁已满足」
- [x] **DOC-06** 文档对齐：传输安全文案（独立 HMAC 字段 vs AES-GCM authTag）— `docs/02` RC 实现说明
- [x] **DOC-07** `plan.md` 迁出根目录 → [plan 概述归档](./archive/20260529_095839_plan概述_SSOT后归档.md)（2026-05-29）

---

## PRD 与架构缺口（来源：[评估归档](./archive/20260529_095839_实现文档一致性评估_评估.md) §3、§4）

### P0 — 发布判断 / PRD 承诺

- [ ] **PRD-F-01** 任务树右侧任务详情面板（负责人/状态/描述/子任务/关联文件）（`01` §8.3）
- [ ] **PRD-F-02** 聊天文件发送（拖拽/点击，P2P）（`01` §6.3）
- [ ] **PRD-F-03** 书签内嵌 WebView，不离开应用（`01` §10.3）
- [ ] **PRD-F-04** 视频内嵌播放 mp4/webm（`01` §10.2）
- [x] **PRD-F-05** 全局搜索跳转高亮（`highlightTaskId` / `highlightMsgId` 各视图消费）— 同 **UX-X-01** / **UX-F-01**
- [ ] **PRD-F-06** 看板卡片展示截止日期/标签；支持拖入垃圾桶删除（`01` §7.2–7.3）
- [ ] **PRD-F-07** 离线 7 天内消息补同步 — 与 **ARCH-07**
- [x] **PRD-F-08** 顶栏个人信息配置面板（`TopBar` profile 非 disabled）（`01` §5.2）— 与 **UX-F-06**（RC：只读资料弹窗）
- [ ] **PRD-F-09** 驾驶舱部门完成率视图（`01` §12.1）
- [ ] **PRD-F-10** 文件断点续传（中断后续传逻辑）
- [ ] **PRD-F-11** 传输限速可配置（`01` §10.4）
- [ ] **PRD-F-12** 传输历史可查（完整历史归档 UI）

### P1 — 架构演进项

- [ ] **ARCH-01** 群组密钥 24h 轮换：主进程处理 `group_key_rotate`
- [ ] **ARCH-02** 手动添加节点（IP:端口）UI/IPC
- [ ] **ARCH-03** UDP 组播发现（跨子网；当前仅广播 `43123`）
- [x] **ARCH-04** 文档说明：ECDH + AES-GCM authTag vs 文档「独立 HMAC」字段 — 同 **DOC-06**
- [ ] **ARCH-05** IndexedDB 热缓存实现，或 PRD/README 降级为仅 SQLite
- [x] **ARCH-06** PRD/README 中 Yjs / WebRTC / IndexedDB 标为目标栈 vs RC 现状 — 同 **DOC-02/04**
- [ ] **ARCH-07** 7 天离线补同步队列 — 与 **PRD-F-07** / **DOC-03**
- [ ] **ARCH-08** SQLite 库级加密，或更新 plan 归档 / docs「可加密」表述
- [ ] **ARCH-09**（可选）报文层独立 HMAC-SHA256 字段；若不做，在 **ARCH-04** / `docs/02` 明确以 AES-GCM authTag 为准

---

## UI/UX — 功能与交互（来源：[UI 审查归档](./archive/20260529_095839_UI设计审查_ui.md) §3.1、§5）

### 第一批（高价值 / 低成本）

- [x] **UX-F-01** 全局搜索结果跳转后 scrollIntoView + 临时高亮（`GlobalSearch` → Chat/Board/Tree）— 同 **UX-X-01** / **PRD-F-05**
- [x] **UX-F-02** 他人消息显示昵称（`MessageBubble` + `members` 映射）
- [x] **UX-F-03** 驾驶舱加载失败：错误页 + 重试，勿展示全 0 假数据（`CockpitView`）— 同 **UX-X-03**
- [x] **UX-F-04** App 启动身份拉取失败：错误页/重试，区分未配置 vs 服务不可用（`App.tsx`）— 同 **UX-X-04**
- [x] **UX-F-05** 全局搜索失败：`message.error` 或 AutoComplete 错误态（`GlobalSearch.tsx`）— 同 **UX-X-05**
- [x] **UX-F-06** TopBar「个人设置」：实现或移除 disabled 项 — 同 **UX-X-06** / **PRD-F-08**

### 第二批（体验 polish）

- [x] **UX-F-07** 成员列表：提升到 store 或 ChatView 下发，避免 ChatView/MemberList 重复 IPC
- [x] **UX-F-08** 聊天 Enter 发送 / Shift+Enter 换行 + 输入区提示（`chat.inputHintEnter`）
- [x] **UX-F-09** 聊天消息日期分组（今日/昨日/完整日期）
- [x] **UX-F-10** 看板整体空态 + 创建任务 CTA（四列皆空）
- [x] **UX-F-11** 看板列内「拖放任务到此」dashed 占位 + i18n
- [x] **UX-F-12** 甘特：任务详情弹窗编辑日期（单击任务条 → 日期 Modal）
- [x] **UX-F-13** 文件 Table 空态：`locale.emptyText: t('files.empty')`
- [x] **UX-F-14** 创建群组失败：`catch` + `message.error`（`CreateGroupModal`）— 同 **UX-W-01**
- [x] **UX-F-15** 默认路由：重定向 `activeGroupId` 或首群，非写死 `demo-project` — 同 **UX-W-09**
- [x] **UX-F-16** `navigationStore` 演示群名 i18n（`groupLabels.ts` / `resolveGroupDisplayName`）
- [ ] **UX-F-17** TopBar 连接状态点 + 重连（在线/离线/同步）
- [ ] **UX-F-18** BottomNav 未读/待办角标（chat、board 等）
- [x] **UX-F-19** 驾驶舱 AI 报告：复制按钮、最大高度 + 展开（`CockpitView`）
- [x] **UX-F-20** 代码块右上角「复制代码」（`CodeBlock.tsx`）
- [x] **UX-F-21** 未知消息类型 i18n fallback，非 raw `[type]`
- [x] **UX-F-22** 文件预览失败：侧栏/预览区错误态 + 重试（`FilesView` + `ViewErrorCenter`）

---

## UI/UX — 国际化（来源：[UI 审查归档](./archive/20260529_095839_UI设计审查_ui.md) §3.2）

- [x] **UX-I-01** 看板列标题 i18n（`kanban.ts` TODO/IN PROGRESS/DONE/OTHER）
- [x] **UX-I-02** 任务优先级 Tag/Select i18n（`KanbanCard`、`BoardView`）
- [x] **UX-I-03** 任务引用气泡 i18n（`MessageBubble`「📋 任务：」）
- [x] **UX-I-04** 送达状态：i18n 文案 + aria（`deliveryStatusMeta`）
- [x] **UX-I-05** 书签 URL placeholder i18n（`FilesView`）
- [x] **UX-I-06** 切换 locale 时更新 `document.documentElement.lang`（`index.html` 默认 zh-CN）
- [ ] **UX-I-07** `browserLanpmStub.ts` 错误文案 i18n（开发桩）— 可并入 **I18N-06**
- [ ] **UX-I-08** 收尾硬编码：FilesView / GanttView / TaskTreeView / CockpitView / KanbanCard 等（评估 §5）

---

## UI/UX — 无障碍（来源：[UI 审查归档](./archive/20260529_095839_UI设计审查_ui.md) §3.3）

- [x] **UX-A-01** Logo `alt` 文案（`TopBar`）
- [x] **UX-A-02** 用户菜单按钮 `aria-label={t('topbar.userMenu')}`
- [x] **UX-A-03** `@` 提及：↑↓ 选择、Enter/Tab 确认、Esc 关闭（`useMentionSuggest`）
- [x] **UX-A-04** 全局 `:focus-visible` focus ring
- [x] **UX-A-05** 禁用 Tab：`aria-disabled`（`BottomNav`）
- [x] **UX-A-06** 看板卡片「移动到列」菜单（键盘替代拖拽）
- [x] **UX-A-07** DM chip `title` 改为 peer 显示名（`DmSessionBar`）
- [x] **UX-A-08** Mention 候选勿默认展示完整 userId（仅 `displayName`）
- [x] **UX-A-09** Setup Upload 避免嵌套 `<button>`（`SetupWizard`）

---

## UI/UX — 视觉与布局（来源：[UI 审查归档](./archive/20260529_095839_UI设计审查_ui.md) §3.4–3.6）

> 与已完成审计项 **V-01~V-14** 编号不同；此处 **UX-V-*** / **UX-R-*** / **UX-N-*** 来自 UI 审查。

- [x] **UX-V-01** 加载态统一：`ViewLoadingCenter` 带「加载中…」；App Spin 与之一致
- [x] **UX-V-02** `ChatView` 加载改用 `ViewLoadingCenter`
- [x] **UX-V-03** 甘特 `gantt-task-react` 暗色主题覆盖与 `--lanpm-*` 对齐（`gantt.module.css`）
- [x] **UX-V-04** 看板列头英文大写与中文 UI 统一 — 与 **UX-I-01**
- [x] **UX-V-05** 看板卡片 assignee 显示昵称非 raw userId（`chatMembersStore`）
- [x] **UX-V-06** Setup 图标使用 `resources/logo.svg` 替代字母「L」
- [x] **UX-V-07** 驾驶舱失败 vs 真实 0 — 与 **UX-F-03**
- [x] **UX-V-08**（文档）Hash 路由 `#/g/...` 深链说明 — `docs/05` §2
- [ ] **UX-R-01**（可选）小窗口 `@media` 断点设计
- [ ] **UX-R-02** TopBar 窄窗 flex-wrap / 折叠菜单
- [ ] **UX-R-03** 聊天侧栏窄窗宽度策略（当前固定 240px）
- [ ] **UX-R-04** 看板窄屏单列/stack 模式
- [ ] **UX-R-05** 文件预览区窄屏单栏模式
- [ ] **UX-R-06** BottomNav 窄屏仅 icon 模式
- [x] **UX-N-01** 驾驶舱返回群路径（与 BottomNav 对称性）— 同 **UX-W-05** / **UX-PATH-01**
- [x] **UX-N-02** `GroupViewGuard` 非法视图 redirect 时 toast — 同 **UX-W-07**
- [x] **UX-N-03** 职能群禁用 Tab 首次引导（`BottomNav` + `Modal.info`）
- [x] **UX-N-04** 匿名群 `leaveAnonymous` 切换群时确认 UI — 同 **UX-W-06**

---

## 去重索引（实现时只算一项）

| 主题 | 主 ID | 合并 |
|------|--------|------|
| 搜索跳转高亮 | **UX-X-01** | UX-F-01、PRD-F-05 |
| 发文本不丢 draft | **UX-X-02** | — |
| 驾驶舱加载失败 | **UX-X-03** | UX-F-03、UX-V-07 |
| App 身份失败 | **UX-X-04** | UX-F-04 |
| 搜索 API 失败 | **UX-X-05** | UX-F-05 |
| 个人设置 | **UX-X-06** | UX-F-06、PRD-F-08 |
| 创建群失败 | **UX-W-01** | UX-F-14 |
| 默认路由/Setup 进群 | **UX-W-09** | UX-F-15、UX-PATH-06 |
| 驾驶舱返回群 | **UX-W-05** | UX-N-01、UX-PATH-01 |
| 非法 view redirect | **UX-W-07** | UX-N-02 |
| 匿名群进/退 | **UX-W-06** | UX-N-04、UX-PATH-07 |
| 7 天离线同步 | **ARCH-07** | PRD-F-07、DOC-03 |
| 文档技术栈表述 | **ARCH-06** | DOC-02、DOC-04、**B-04**（若放弃 WebRTC） |
| 传输安全文案 | **ARCH-04** | DOC-06、ARCH-09（可选实现） |
| 看板列名 i18n | **UX-I-01** | UX-V-04 |
| @ 键盘 | **UX-A-03** | ux §3.3 与 **UX-W** 提及路径 |
| 成员搜索 P1 | **P1-R-06** | 评估 §4.2 |
| plan 已迁 archive | **DOC-07** `[x]` | DOC-01 |

> **说明**：上表左侧为主 ID；勾选完成时同步勾选合并列，或只保留主 ID 一条。
