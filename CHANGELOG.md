# Changelog

本文件记录 LanPM 项目变更，最新条目在最上方。

## [1.0.0-rc.14] - 2026-05-29

### Added
- **`devPreviewClient.ts`**：浏览器/Cursor 预览移除 `vite-error-overlay` 并标记 `data-lanpm-browser-preview`
- **`browserPreview.ts`**：`isBrowserPreview()` 辅助判断开发态浏览器桩
- **Vite 插件**：`lanpmDevOverlayGuardHtmlPlugin`（内嵌页禁用错误遮罩）、`lanpmFullReloadGuardPlugin`（拦截 preload 触发的 full-reload 风暴）
- **`dev:web`** 注入 `LANPM_BROWSER_DEV=1`，关闭 HMR，专用于浏览器预览
- **BottomNav 均分 Tab**（**UX-INT-01**）：槽位分隔线、区域 hover / active / 选中顶条
- **`regionInteract.module.css`** + **`RegionButton`** + **`ViewSegment`** + **`RegionTabBar`**：交互区域 hover/active/selected 共用样式与 Tab/分段切换基础（**UX-INT-07** 前置）
- **DM 会话条 Tab 化**（**UX-INT-02**）：`DmSessionBar` 改用 `RegionTabBar`，横向均分 + 溢出滚动

### Fixed
- **浏览器预览默认可点击**：Stub 开发态自动写入预览身份，避免 Setup 全屏遮罩挡住 `#/g/.../chat`
- **Cursor 内嵌浏览器**：`full-reload` 不再因 preload 重建导致整页刷新循环
- **`HomeRedirect`**：改用 `useNavigate` + `useEffect`，减少 StrictMode 双次重定向
- **Setup 未完成**：恢复全屏 Setup 向导（非 overlay），Electron 与浏览器行为一致

### Changed
- **Vite dev server**：`host: 'localhost'`；非 browser dev 关闭 HMR overlay；扩展 `watch.ignored`
- **开发态 StrictMode**：仅生产构建启用，减轻 dev 双挂载副作用
- **`HashRouter`**：移除 `future` 实验 flag
- **todo.md**：新增 §UX-INT 交互区域与点击反馈 backlog

### Tag
- `v1.0.0-rc.14` — Cursor/浏览器预览可点击修复、BottomNav 均分改版与 dev 热更新防护

## [1.0.0-rc.13] - 2026-05-29

### Added
- **`dev:web`**：仅启动渲染进程 Vite（`electron-vite dev --rendererOnly`）
- **`bootstrap.tsx`** + **`RootErrorBoundary`**：异步启动与渲染崩溃兜底，避免浏览器/Cursor 预览白屏无提示
- **`useLanpmApp`**：统一 `App.useApp()` 的 `message` / `modal`，替代静态 API 以正确消费主题
- 路由与视图 **React.lazy** 分包（`GroupView` / `CockpitView` / 各 Tab 视图）
- 身份未配置时 **Setup 全屏 overlay**，主壳（TopBar/BottomNav）仍可预览

### Fixed
- **Cursor 内置浏览器**：`installLanpmBridge` 开发态优先走浏览器桩，不再因 Electron UA 误判 preload 失败
- **Vite 开发服务**：`host: '::'` + `dns.setDefaultResultOrder('ipv4first')`，修复 `localhost` → `::1` 白屏
- 开发态 **移除 index.html CSP**（Vite HMR / Cursor 预览与 port 通配 CSP 冲突）
- **`npm run dev`**：`env -u ELECTRON_RUN_AS_NODE`，避免 Cursor 终端继承变量导致 Electron 无法启动
- **`HomeRedirect`** / **`navigationStore`**：占位群列表默认可用，未完成 Setup 时首页不再永久 loading
- **`networkStore`**：IPC 不可用时静默忽略，不阻塞页面
- Ant Design **`Spin.tip` 嵌套警告**；Tag 暗色对比（`color="default"`）

### Changed
- **`ThemeProvider`**：包裹 `antd App`；补齐 Segmented / Tree / Menu / Slider 等暗色 Token
- **`index.html`**：根节点增加「LanPM 加载中…」占位

### Tag
- `v1.0.0-rc.13` — Cursor/浏览器开发预览修复、启动健壮性与 Ant Design 静态 API 迁移

## [1.0.0-rc.12] - 2026-05-29

### Added
- **TopBar 连接状态点**：在线 / 离线 / Stub 三色指示；离线点击重连（**UX-F-17**）
- **`network:getStatus` / `network:reconnect`** IPC + `networkStore`
- **BottomNav 角标**：当前群聊天未读、看板待办根任务数（**UX-F-18**）
- **`badge:getGroupTabBadges`** IPC + `badgeStore`；`markRead` 成功后刷新角标
- **全局搜索成员**（**P1-R-06**）：命中后跳转聊天并预填 `@昵称`
- BottomNav 窄屏仅 icon（**UX-R-06**，`@media max-width: 720px`）

### Fixed
- **ThemeProvider**：Ant Design Token 改用实色 palette（Table/Tag/Select 暗色下不再因 CSS 变量运算异常）
- 看板列头任务数改用 `.columnCount`，避免 Tag 在暗色主题对比度问题

### Changed
- **ARCH-09** 勾选：不实现独立 HMAC，以 AES-GCM authTag 为准
- i18n +5 键（网络状态、搜索成员）；**todo.md** 第五批勾选

### Tag
- `v1.0.0-rc.12` — 连接感知、Tab 角标与成员搜索

## [1.0.0-rc.11] - 2026-05-29

### Added
- **文件 → 群聊**：预览区「发送到群聊」预填 `composeDraft`（**UX-FLOW-02**）
- **看板卡片「移动到列」** `⋯` 菜单，键盘替代拖拽（**UX-A-06**）
- **职能群 Tab 首次引导**：点击禁用 Tab 弹出能力说明（**UX-N-03**）
- **任务树行内进度**：叶子任务双击进度条 → `Slider` 调整（**UX-PATH-04**）
- **甘特日期编辑 Modal**：单击任务条编辑起止日期；Modal 内「在看板中查看」（**UX-F-12**；**UX-FLOW-03** 保留）

### Changed
- **README**：浏览器 Stub 与 Electron 差异表（**UX-DEV-01**）
- **ARCH-06** 勾选：目标栈 vs RC 表述已在 `docs/01` / README
- i18n +13 键；**todo.md** 第四批协作链与路径优化勾选

### Tag
- `v1.0.0-rc.11` — 跨视图协作收尾、看板键盘移动与甘特/树路径优化

## [1.0.0-rc.10] - 2026-05-29

### Added
- **`chatMembersStore`**：群成员集中加载；看板 assignee / 聊天昵称复用（**UX-F-07** / **UX-V-05**）
- **`groupLabels.ts`**：演示群 `demo-*` 显示名 i18n（**UX-F-16**）
- **`useMentionSuggest`** + **`mentionKeyboard.ts`**：@ 提及 ↑↓ / Enter·Tab / Esc（**UX-A-03**）
- **`chatDateGroups.ts`**：消息按日分组（今天/昨天/日期）；送达状态 i18n + aria（**UX-F-09** / **UX-I-04**）
- 看板 **「在聊天中讨论」** → 聊天预填 `composeDraft`（**UX-FLOW-01**）
- 甘特单击任务条 → 看板 `highlightTaskId` 高亮（**UX-FLOW-03**）
- 驾驶舱报告 **复制 / 展开·收起**（**UX-F-19**）
- 全局 `:focus-visible` focus ring；TopBar Logo `alt`、用户菜单 `aria-label`（**UX-A-01/02/04**）

### Fixed
- **ChatView**：Enter 发送 / Shift+Enter 换行 + 输入提示（**UX-F-08**）；`composeDraft` 路由预填
- **FilesView**：预览加载失败 `ViewErrorCenter` 重试，与「不支持预览」区分（**UX-F-22**）
- **SetupWizard**：`logo.svg` 替代字母 L；Upload 去嵌套 `<button>`（**UX-V-06** / **UX-A-09**）
- **DmSessionBar**：DM chip `title` 用 peer 显示名（**UX-A-07**）
- **TopBar**：DM 中 Logo 回 `lastOriginGroupId` 项目群（**UX-PATH-05**）
- **BottomNav**：禁用 Tab 增加 `aria-disabled`（**UX-A-05**）
- **MentionSuggest**：候选仅展示 `displayName`（**UX-A-08**）

### Changed
- **docs/02**：DOC-06 / ARCH-04 — RC 以 AES-GCM `authTag` 为完整性校验，独立 HMAC 标 post-RC
- **docs/05**：Hash 路由 `#/g/...` 深链说明（**UX-V-08**）
- 甘特暗色主题 CSS 与 `--lanpm-*` 对齐（**UX-V-03**）
- i18n +29 键（送达状态、演示群名、报告复制、书签 URL 等）；**todo.md** 第三批 polish 勾选

### Tag
- `v1.0.0-rc.10` — 聊天 polish、跨视图协作链、无障碍与 DOC-06

## [1.0.0-rc.9] - 2026-05-29

### Added
- **`ProfileModal`**：顶栏个人设置只读资料（**UX-X-06** / **PRD-F-08**）
- **`HomeRedirect`** + **`pickDefaultGroupId`**：启动/Setup 后优先进入非 `demo-*` 真实群（**UX-W-09** / **UX-F-15**）
- 驾驶舱 **「继续协作」** + `lastNonCockpitPath`；顶栏 Logo 从驾驶舱返回上次协作路径（**UX-W-05** / **UX-PATH-01**）
- 看板列 i18n、列内拖放占位、整体空态与 toolbar 行内快速建任务（**UX-I-01** / **UX-F-10/11** / **UX-PATH-03**）

### Fixed
- **TopBar**：私聊会话在下拉显示「私聊：{name}」；切换群组时不再对 `dm:*` 误调 `leaveAnonymous`（**UX-X-07**）
- **MessageBubble**：他人消息显示成员昵称（**UX-F-02**）
- **CodeSendModal** / **AiConfigModal** 失败 toast；用户菜单 API Key 跳转驾驶舱并自动打开配置（**UX-W-02** / **UX-PATH-02**）
- **ChatView**：消息加载失败重试；`markRead` 失败 toast；`ViewLoadingCenter` 加载态
- **GroupViewGuard** 非法视图 redirect 提示；匿名群进入说明与离开确认（**UX-W-06/07**）
- **`loadGroups` 失败** toast；`document.documentElement.lang` 随 locale 切换（**UX-I-06**）

### Changed
- **docs/01** §1.3.1 RC 实现现状表；**docs/03** §16.11 七天离线标 P1/post-RC
- **README** 目标架构 vs RC 实现分栏；`verify:m7` ≠ 1.0.0 门禁表述（**DOC-02~05**）
- **todo.md**：P0 断环全部完成；UX-W / 多项 polish 与文档项勾选

### Tag
- `v1.0.0-rc.9` — 个人设置/私聊顶栏 + P1 弱闭环 + 文档对齐 + 看板/i18n polish

## [1.0.0-rc.8] - 2026-05-29

### Added
- **`useSearchHighlight`**：全局搜索跳转后 scrollIntoView + 3.2s 高亮脉冲（聊天 / 看板 / 任务树）
- **`ViewErrorCenter`**：页级加载失败 + 重试（驾驶舱、App 启动身份）
- **代码块「复制代码」**（`CodeBlock.tsx`）

### Fixed
- **UX-X-02**：纯文本发送成功后再清空 draft，失败保留并 toast
- **UX-X-04**：`getSetupStatus` 失败显示错误页，不再误进 Setup 向导
- **UX-X-03**：驾驶舱加载失败不再展示全 0 假数据
- **UX-X-05**：全局搜索 API 失败 toast，与「无结果」区分
- **UX-W-01 / UX-F-14**：创建群组失败 toast
- **UX-X-08**：任务树选中父任务时提示进度不可直接编辑

### Tag
- `v1.0.0-rc.8` — P0 断环与高价值 UX 批次

## [1.0.0-rc.7] - 2026-05-29

### Added
- **`todo.md` 唯一任务真源（SSOT）**：合并 `ui` / `ux` / `评估` / `plan` 全部可执行项（UX-X/W/PATH/FLOW、DOC/PRD-F/ARCH、P1 backlog、去重索引）
- **审查文档归档**（根目录不再保留）：
  - `archive/20260529_095839_plan概述_SSOT后归档.md`
  - `archive/20260529_095839_UI设计审查_ui.md`
  - `archive/20260529_095839_UX操作路径审查_ux.md`
  - `archive/20260529_095839_实现文档一致性评估_评估.md`
  - `archive/20260529_093804_plan详细章节迁todo后归档.md`

### Changed
- **Electron 工具链升级**：`electron` ^41.7、`electron-vite` ^5、`vite` ^8、`electron-builder` ^26；`better-sqlite3` ^12.10
- **`electron.vite.config.ts`**：preload 显式 `ssr.external: ['electron']`，避免沙箱下 preload 打包失败导致窗口空白
- **`CodeBlock.tsx`**：highlight.js 主题 CSS 改用 `?url` 静态导入（兼容 Vite 8）
- **`README.md` / `docs/00` / `docs/03` / `docs/05`**：执行入口改为 `todo.md`，计划概述指向 archive

### Removed
- 根目录 `plan.md`、`评估.md`（内容已迁 archive；任务仅在 `todo.md` 维护）

### Tag
- `v1.0.0-rc.7` — todo SSOT + 审查归档 + Electron/Vite 8 升级

## [1.0.0-rc.5] - 2026-05-29

### Added
- **`verify:project`**：版本与 CHANGELOG 对齐、docs 索引、`lint` + `verify:search` 串联
- **i18n 类型体系**：`types.ts`（`MessageKey` 联合类型）、`navKeys.ts`、`presence.ts`
- **全视图 i18n**：App / TopBar / BottomNav / 看板 / 树 / 甘特 / 文件 / 聊天 / 驾驶舱 / 群组 / AI 配置 / Setup 等硬编码中文迁至 zh-CN / en-US（230+ 键）

### Fixed
- **ESLint**：移除未使用导入（main/network/renderer）、`ganttAdapter` prefer-const、`GanttView` 主题色刷新
- **`verify:topbar`**：直接导入 locale 模块，避免 Node ESM 解析 `messages.ts` 失败导致 `verify:m7` 中断

### Changed
- **`verify:m7`**：增加 `verify:search` 步骤
- **`docs/08`**：RC 版本号与 `verify:project` / `verify:search` / `build` 验收项同步
- **`todo.md`**：Linux 自动化回归与项目检查项勾选；索引 docs/09 与检查报告归档

### Tag
- `v1.0.0-rc.5` — 全视图 i18n + verify:project 项目健康检查

## [1.0.0-rc.4] - 2026-05-28

### Added
- **`verify:visual`**：设计令牌、布局尺寸、禁止 `#1677ff`、共享 UI 组件静态守卫（纳入 `verify:m7`）
- **`docs/09_视觉手验清单.md`**：V-14b 亮/暗七页手验与截图归档说明
- **UI 共享组件**：`ViewHeader`、`ViewToolbar`、`ViewState`（`src/renderer/src/ui/`）
- **设计令牌扩展**：`--lanpm-border`、`--lanpm-bubble-bg`、`--lanpm-code-bg`、`--lanpm-accent-fill*`（`global.module.css`）

### Changed
- 五业务视图 + 驾驶舱：统一强调色、工具栏、加载/空状态；主区内边距 16px；顶栏 56px / 底栏 64px
- `docs/05` §1：实测尺寸、页标题语义、令牌表、亮暗手验指引
- `GroupView`：合并为单一路由渲染；移除 M1 占位死代码
- `plan.md` / `todo.md`：待办全部迁入 `todo.md`；`plan.md` 仅保留战略与索引（V-01~V-13 已勾选，V-14 手验截图待做）

### Removed
- 未引用遗留 UI：`features/shell/*`、`features/views/*`（ViewPlaceholder / CockpitPlaceholder）

### Tag
- `v1.0.0-rc.4` — 视觉一致性 S1–S3 落地（V-01~V-13）

## [1.0.0-rc.3] - 2026-05-28

### Added
- **驾驶舱 AI 服务商预设**：DeepSeek（默认）、通义千问、智谱 GLM、Moonshot、OpenAI、Anthropic、自定义；`src/shared/cockpit/aiProviders.ts`
- **视觉一致性整改计划**：`plan.md` §12 + `todo.md` V-01~V-14（全页面审计任务清单）

### Changed
- `plan.md`：M0–M7 逐阶段详情归档至 `archive/20260528_235810_M0-M7完成_plan逐阶段执行计划归档.md`；现行计划聚焦 RC→1.0、v1.1 backlog 与视觉补丁
- `AiConfigModal`：按服务商切换 baseUrl/model，API Key 占位随厂商变化
- `verify:search`：覆盖 AI 预设与默认 DeepSeek 断言

### Tag
- `v1.0.0-rc.3` — plan 归档 + 国内 AI 预设 + 视觉整改计划

## [1.0.0-rc.2] - 2026-05-28

### Added
- **品牌图标**：标准聊天气泡 + 内置 Wi‑Fi（双弧）+ 橙色 TODO 热点圆心；`npm run build:icons` 从 SVG 生成 PNG/ICO
- **顶栏全局搜索**：`search:query` IPC、`searchRepository`（SQLite FTS）、`GlobalSearch` 组件；`npm run verify:search`
- **看板删除任务**：`task:deleteTask` 软删除 + `KanbanCard` Popconfirm

### Changed
- `resources/icon.svg` / `logo.svg`：与 `--lanpm-accent` 蓝白主色 + `#ff9f0a` 任务点缀一致；Wi‑Fi 区域 scale 0.50
- `docs/08`：RC 后迭代项移除「全局搜索 / 看板删除」占位说明
- `todo.md` 精简；M0–M7 执行清单归档至 `archive/20260528_234920_M7完成_todo执行清单归档.md`

### Tag
- `v1.0.0-rc.2` — RC2 品牌图标 + 全局搜索 + 看板删任务

## [1.0.0-rc.1] - 2026-05-28

### Added
- M7 全量回归：`npm run verify:m7`（rebuild:verify → M0–M7 → rebuild:native）
- `npm run rebuild:verify`：系统 Node 用 better-sqlite3 编译
- `verify:m7-acceptance`：`docs/03` §16 模块存在性映射
- `verify:m7-stability`：SQLite WAL 持久化 / 会话 meta 恢复
- `verify:m7-perf`：DB 初始化、加密、路由 P95 冒烟
- [docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md)

### Notes
- **RC1**：M0–M7 P0 功能闭环；顶栏全局搜索、任务删除 UI、任务 P2P 同步等为 RC 后迭代项（见 docs/08）
- 性能冷启动/内存需按 docs/06 §3 在生产构建上手测填表

### Tag
- `v1.0.0-rc.1` — LanPM 首个 RC

## [0.10.0-m6] - 2026-05-28

### Added
- M6 真实网络：`RealNetworkTransport`（UDP 43123 发现 + TCP 加密数据通道）
- M6 加密：ECDH `prime256v1` + AES-256-GCM 信封（`dhSession` / `envelopeCrypto`）
- 指数退避重连（1s→20s）；`LANPM_NETWORK=stub|real`（默认 real）
- 双实例可设 `LANPM_TCP_PORT` 区分 TCP 端口
- `npm run verify:m6`（加密 + 本机 P2P 回环）

### Changed
- 主进程 `initNetwork` 统一 Stub/Real 工厂；`verify:*` 脚本默认 `LANPM_NETWORK=stub` 处显式设置
- `peerDirectory` 统一 LAN userId 发现；presence TTL 改用共享 `PEER_TTL_MS`

### Tag
- `v0.10.0-m6-real-network` — M6 UDP 发现 + 加密 P2P

## [0.9.0-m5] - 2026-05-28

### Added
- M5-01 群组：`groupRepository` / `groupService`；三类群组创建与 SQLite 持久化；TopBar 创建/切换
- M5-02 匿名群：内存会话消息、仅文本、退出清历史；`assertGroupAllows*` 按 DB 类型校验
- M5-03~04 驾驶舱：`CockpitView` 指标卡、项目进度、部门完成率
- M5-05 API Key：`aiConfigService`（`safeStorage` / AES-GCM 回退）+ 配置弹窗
- M5-06 AI：周报/月报/项目评估（脱敏字段）；可选外部 OpenAI 兼容 API
- `group:*` / `cockpit:*` IPC；`npm run verify:m5`

### Tag
- `v0.9.0-m5-groups-cockpit` — M5 群组与驾驶舱

## [0.8.1-m4] - 2026-05-28

### Added
- M4-04 甘特导出：`GanttView` 工具栏「导出 PNG / PDF」；`html2canvas` + `jspdf`
- M4-08 书签：`bookmarkService` + Netscape HTML 解析/导出（`shared/file/bookmarks.ts`）
- 书签 IPC：`file:addBookmark` / `file:importBookmarks` / `file:exportBookmarks`
- `FilesView`：书签分类、手动添加、HTML 导入/导出、链接预览
- `verify:m4` 扩展书签 parse/export 断言

### Tag
- `v0.8.1-m4-gantt-export-bookmarks` — M4 P1 甘特导出与书签

## [0.8.0-m4] - 2026-05-28

### Added
- M4 甘特图：`gantt-task-react` + `GanttView`（日/周/月、拖拽排期、里程碑双击）
- 任务依赖：`task_dependencies` 仓储 + `task:upsertDependency`；FS 依赖渲染甘特连线
- M4 文件：`FilesView` 列表/分类筛选/预览区；`file:*` IPC
- LibreOffice 预览：`soffice --headless` 转 PDF；图片/文本/PDF 内联预览
- 分片上传 Stub：256KB 分片、并发 ≤3、传输队列 Progress
- `npm run verify:m4`

### Tag
- `v0.8.0-m4-gantt-files` — M4 甘特图与文件模块（P0）

## [0.7.0-m3] - 2026-05-28

### Docs
- 新增 [docs/07_M3_看板与任务树实现说明.md](./docs/07_M3_看板与任务树实现说明.md)（架构、IPC、交互、限制、M4 衔接）
- 反哺 `docs/00`~`06`、`plan.md`：M3 实现映射、验收证据、联调步骤 §2

### Added
- M2-05 成员在线态：`aggregateUserPresence` 多设备聚合；`presenceRegistry` + 5s 心跳；`MemberList` 🟢🟡⚪
- M2-06 已读回执：按 `userId` 聚合；`readReceiptService` + `useMarkRead`；消息 ✅✅ 状态
- M2-07 `/task` 快捷创建：`parseTaskCommand` + `TaskCreateModal` + `createTaskFromChat`
- M3-01 任务模型与仓储：`taskRepository` / `taskService` + `task:*` IPC
- M3-02 看板四列拖拽：`BoardView` + `@dnd-kit/core`（TODO/IN PROGRESS/DONE/OTHER）
- M3-03 `OTHER` 列原因强校验：`OtherReasonModal` + `validateOtherReason`
- M3-04 任务树：`TaskTreeView` 父子结构、展开折叠
- M3-05 父任务进度聚合：`aggregateChildProgress` / `applyAggregatedProgress`
- M3-06 聊天创建任务闭环：`task_ref` 消息 + 看板/树视图接入 `GroupView`
- M2-08 Stub 联调验收：`npm run verify:read-receipt` + `verify:m2-integration`（chat/已读/task 闭环）
- `npm run verify:presence` / `verify:m3`；`verify:m2` 串联 read-receipt + m2-integration

### Changed
- `chatBroadcast` 抽取广播逻辑；NetworkStub 支持 presence / read_receipt 同步
- 浏览器预览 Stub：任务、已读回执、在线态三态演示

### Tag
- `v0.7.0-m3` — M2-B 回执/在线态 + M3 看板与任务树

## [0.6.4-m2] - 2026-05-28

### Added
- M2-04 私聊：`buildDmGroupId` 确定性会话 ID；`dmStore` 会话列表（localStorage）
- `MemberList` 私聊入口；`DmSessionBar` 会话切换与返回群聊
- DM 群组仅允许 `chat` 视图；`memberService` / 浏览器 stub 仅返回双方成员
- `npm run verify:dm`；`verify:m2` 串联 mentions + dm + chat

### Tag
- `v0.6.4-m2-dm` — M2 私聊入口与会话切换

## [0.6.3-m2] - 2026-05-28

### Added
- M2-03 @提及：`parseMentions` / `MemberList` / `MentionSuggest` / `MentionText` 高亮
- 桌面通知：Electron `notifyIfMentioned`；浏览器 `useMentionNotifications`
- `chat:listMembers` IPC（Stub + LAN peers + 本机用户）
- `npm run verify:mentions`

### Changed
- `messageRepository` 持久化 `mentions`（包装 `{ content, mentions }`）
- `verify:chat`：增加 `parseMentions(@Bob)` 断言
- `verify:m2`：串联 `verify:mentions` + `verify:chat`
- `todo.md`：M2-03 标记完成

### Tag
- `v0.6.3-m2-chat-mention` — M2 @提及与桌面通知

## [0.6.2-m2] - 2026-05-28

### Fixed
- preload 构建强制 CJS 输出，修复 Electron 沙箱中 `import outside module` 导致脚本无法加载
- 主进程 preload 路径解析增加 `index.cjs` 候选
- `getSuggestedDeviceName` 改由主进程同步 IPC 提供，preload 不再直接依赖 `node:os`
- Linux 无 GPU 时禁用硬件加速，避免 Electron FATAL 退出

### Tag
- `v0.6.2-m2-preload-fix` — preload CJS 与设备名 IPC 修复

## [0.6.1-m2] - 2026-05-28

### Added
- M2-02 代码消息：`sendCodeMessage` + `chat:sendCode` IPC；`detectLanguage` 启发式识别
- `CodeBlock`（highlight.js 语法高亮，跟随亮/暗主题）、`CodeSendModal` 发送入口
- 聊天输入栏「代码」按钮（对齐 `docs/05` §6.1）

### Changed
- `chatService`：抽取 `publishChatMessage` 复用文本/代码发送
- `verify:chat`：增加 Python 代码块收发 + `detectLanguage` 断言
- `todo.md`：M2-02 标记完成

### Tag
- `v0.6.1-m2-chat-code` — M2 代码消息与高亮

## [0.6.0-m2] - 2026-05-28

### Added
- M2-01 文本消息：`chatService`（NetworkStub 收发 + SQLite 持久化）、`chat:*` IPC
- `ChatView`：消息列表、输入框、Ctrl+Enter 发送、投递状态（⏳/✅）
- `src/shared/chat/types.ts`：`ChatMessage` / `ChatPayload`（对齐 `docs/04` §3.3）
- `npm run verify:chat`、`verify:m2`（Stub 双实例 + SQLite 冒烟）
- `getSuggestedDeviceName()` + `deviceName.ts`（preload：`os.hostname()`）

### Changed
- 首次配置：仅手填用户名；设备名自动识别本机主机名（修复浏览器 `platform` 误显 `Linux`）
- 桌面端：移除 File/Edit/View 等传统菜单栏（`Menu.setApplicationMenu(null)` + 窗口 `setMenu(null)`）
- `SetupWizard`：iOS 风格分组表单；主题 CSS 变量贯通顶栏/底栏/向导
- `GroupView`：聊天视图接入 `ChatView`（替换占位）
- `browserLanpmStub`：Electron 不覆盖 preload；补齐 `chat` 开发桩
- `todo.md` / `plan.md`：M2-01 完成；M0-06 设备名规则更新

### Tag
- `v0.6.0-m2` — M2 文本聊天 + 配置向导与桌面体验

## [0.5.2-m1] - 2026-05-28

### Added
- `TopBar`：项目切换、驾驶舱、全局搜索占位、主题/语言、用户下拉（对齐 `docs/05` §4）
- i18n：`src/renderer/src/i18n/messages.ts` + `useI18n`（`zh-CN` / `en-US`）
- `npm run verify:topbar`、`verify:m1`（routes + topbar smoke）

### Changed
- 开发：Vite 浏览器预览时 `installLanpmBridge` + `browserLanpmStub`（localStorage 身份桩）
- `ThemeProvider`：同步 `html[data-theme]` 与 Ant Design 暗色算法；`localStorage.theme` 持久化
- `TopBar`：群组切换使用 `useLocation`（修复 HashRouter 下 `window.location` 无效）
- `BottomNav` / 顶栏文案接入 i18n
- `todo.md` / `plan.md`：M1-02、M1-05、M1-06 标记完成

### Tag
- `v0.5.2-m1-topbar` — M1 顶部栏、主题与 i18n 基线

## [0.5.1-m1] - 2026-05-28

### Added
- 主壳路由：`HashRouter` + `/g/:groupId/:view`（chat/board/tree/gantt/files）与 `/cockpit` 占位
- `MainLayout` + `BottomNav`（56px 顶栏 + 64px 底栏，对齐 `docs/05` §1–2）
- `navigationStore` 占位三群组（项目/职能/匿名）；`tabRules.ts` 控制 Tab 可见与非法路由重定向
- `npm run verify:routes`：Tab 规则 smoke

### Changed
- `App.tsx`：配置完成后进入 `AppRouter` 主壳
- `todo.md` / `plan.md`：M1-01、M1-03 标记完成

## [0.5.0-m0] - 2026-05-28

### Added
- `src/shared/network/types.ts`：`NetworkTransport`、`SyncEnvelope`、`DiscoveryPayload`（对齐 `docs/04` §6.4）
- `NetworkStub`：本机文件总线（`$TMP/lanpm-stub`）实现 `publish` / `subscribe` / `discoverPeers`
- 后缀与唯一性：`allocateUserIdWithLanCheck`（SQLite + LAN peer 注册表）、`validateManualUserId`
- `MessageDedup`（`senderDeviceId:msgId`）与 `LamportClock`（M0-10）
- 校验脚本：`npm run verify:suffix`、`verify:network-stub`、`verify:m0`

### Changed
- `idGen` 迁至 `src/shared/identity/idGen.ts`；首次配置走 LAN 感知分配
- 主进程启动时 `initNetworkStub`；配置完成后 `refreshNetworkStubIdentity`
- `todo.md` / `plan.md`：M0-07~M0-10 标记完成

### Tag
- `v0.5.0-m0-network-stub` — M0 后缀规则与 NetworkStub

## [0.4.2-m0] - 2026-05-28

### Added
- 首次配置向导 `SetupWizard`：用户名、设备名、部门、头像（随机/上传）
- 身份 IPC：`identity:getStatus` / `identity:completeSetup`（preload `lanpm.identity`）
- 本机身份：`sync_meta.local_device_id` + `users`/`devices` 写入；未配置时强制向导
- 用户 ID 本地分配：`idGen.allocateUserId`（含 `-yymm` 后缀，M0-07 局域网校验待补）

### Changed
- `App.tsx`：按配置状态切换向导 / 主壳
- `todo.md` / `plan.md`：M0-06 标记完成

## [0.4.1-m0] - 2026-05-28

### Added
- 主进程 SQLite：`better-sqlite3` + `src/main/storage/schema.sql`（对齐 `docs/04` §11，12 张表）
- `initDatabase()`：首次启动在 `{userData}/lanpm.db` 自动建库建表（`user_version=1`）
- `users` / `devices` 仓储：`userRepository`、`deviceRepository`（upsert + 按 ID 查询）
- `npm run verify:storage`：无 UI 校验 DDL 与 users/devices 往返

### Changed
- `src/main/index.ts`：启动时初始化 SQLite，退出时 `closeDatabase()`
- `electron.vite.config.ts`：构建时复制 `schema.sql` 至 `out/main`
- `electron-builder.yml`：`asarUnpack` 包含 `better-sqlite3` 原生模块
- `todo.md` / `plan.md`：M0-04、M0-05 标记完成

### Tag
- `v0.4.1-m0-sqlite-storage` — M0-B 本地存储与 users/devices 仓储

## [0.4.0-m0] - 2026-05-28

### Added
- Electron + electron-vite 工程：`package.json`、`electron.vite.config.ts`、`electron-builder.yml`
- 分层目录：`src/main`、`src/preload`、`src/renderer`（含 `crypto` / `network` / `storage` 占位）
- 渲染进程：React 18 + TypeScript + Ant Design 5 + Zustand 占位页（`App.tsx`、`appStore`）
- ESLint 9 + TypeScript 双项目配置（`tsconfig.node.json` / `tsconfig.web.json`）
- `tests/`、`resources/` 占位目录

### Changed
- `.gitignore`：忽略 `out/`、`*.tsbuildinfo`
- `README.md`：代码基线进入 M0 脚手架阶段
- `plan.md` / `todo.md`：M0-A 工程骨架任务标记完成

### Tag
- `v0.4.0-m0-electron-scaffold` — M0 工程初始化（脚手架）

## [0.3.5] - 2026-05-28

### Added
- 归档 `archive/20260528_190000_文档全量Review报告.md`（全量审查结论与术语对照）

### Fixed
- `docs/00`：追溯矩阵「首次配置」映射修正；补充看板拖拽/任务状态/搜索决策
- `docs/01`：技术栈补全；已读冲突表述去除「服务端序列号」；看板存储值说明
- `docs/03`：看板列与 `@dnd-kit`；匿名群同步策略与 `01` §11.3 对齐
- `docs/05` / `docs/02`：看板拖拽拍板 `@dnd-kit/core`
- `docs/06`：回归清单纳入 §16.12
- `todo.md`：`/task` 改 P0；`M3-02`/`M4-00` 与文档对齐

### Tag
- `v0.3.5-docs-review-fix` — 文档全量 Review 修复

## [0.3.4] - 2026-05-28

### Added
- 锁定前端 UI 技术栈：Ant Design 5.x + CSS Modules + Zustand + `gantt-task-react`（甘特图）

### Changed
- `docs/05`：§8 由「二选一」改为已拍板选型；甘特图实现说明写入 §6.3
- `docs/00` / `plan.md` / `README.md` / `todo.md`：同步 UI 选型与决策表
- `docs/01`：全局搜索 P0 范围与 `03`/`05` 对齐（任务+消息；文件/成员 P1）
- `docs/02`：传输加密表述统一为 UDP + WebRTC + 应用层 AES-GCM/DH/HMAC；补充推荐依赖
- `docs/04`：版本升至 v0.2 基线；§12 三项默认策略定稿

### Tag
- `v0.3.4-tech-stack-lock` — 前端 UI 栈与文档收口

## [0.3.3] - 2026-05-28

### Added
- 新增 `docs/05_交互与UI约定.md`：布局、路由、主题、模块 UI 与组件库选型约定
- 新增 `docs/06_测试与联调手册.md`：NetworkStub、局域网真网、性能测量与 M7 回归清单
- `docs/04` 新增 SQLite 表结构初稿（§11）与 Yjs 粒度拍板（§10）

### Changed
- `docs/01`：核心理念表述与「数据不出域 + 可选 AI 外呼」对齐
- `docs/03`：P0 表 LibreOffice 表述、§17 里程碑补充 Stub、§16.11–12 链至测试手册
- `docs/00` / `README.md` / `plan.md`：纳入 docs/05、06 索引与执行引用

### Tag
- `v0.3.3-docs-deepening` — 文档深化（UI/测试/DDL/Yjs）

## [0.3.2] - 2026-05-28

### Added
- 新增 `docs/00_文档导航.md`：文档索引、P0 追溯矩阵、已拍板决策摘要

### Changed
- 修复 `docs/01`：统一 Office 预览为 LibreOffice 本地链路，更新文档页眉
- 修复 `docs/02`：React 状态管理表述、CRDT 术语补全、更新页眉
- 修复 `docs/03`：补充 P0/P1 边界表、扩充验收项（私聊、`/task`、搜索、甘特依赖、文件续传、AI 手动触发、NFR）
- 修复 `docs/04`：补充 NetworkStub/M6 切换说明与文档索引
- 修复 `plan.md`：M2/M6 排期自洽（Stub 联调 → 真实网络）、维护规则纳入 `docs/01~04`
- 重写 `README.md`：对齐 Electron v2.0 文档体系与当前仓库状态

### Tag
- `v0.3.2-docs-consistency-fix` — 文档自洽性与完整性修复

## [0.3.1] - 2026-05-28

### Added
- 新增 `docs/04_数据模型与协议草案.md`，定义用户/设备/群组/消息/任务/文件等核心实体、同步信封与状态机基线

### Changed
- 更新 `docs/01_产品需求文档.md`：明确前端采用 React 18 + TypeScript、已读聚合规则、Office 本地预览主链路、AI 分阶段策略
- 更新 `docs/02_技术实现建议.md`：补充多设备已读聚合策略与网络协议参数初稿，锁定 Office 预览为 LibreOffice 本地转换
- 更新 `plan.md`：纳入 `docs/04` 执行依据，补充关键决策落地与数据模型交付进展

### Tag
- `v0.3.1-data-model-protocol-draft` — 数据模型与协议草案落版

## [0.3.0] - 2026-05-28

### Added
- 新增编号化文档拆分：
  - `docs/01_产品需求文档.md`
  - `docs/02_技术实现建议.md`
  - `docs/03_验收与里程碑计划.md`
- 新增归档记录：`archive/20260528_164300_原型归档_docs页面迁移.md`

### Changed
- 移除单体文档 `docs/需求文档.md`，改为按主题拆分维护
- 将 `docs/index.html`、`docs/index2.html` 迁移到 `archive/prototypes/`
- 更新 `plan.md`，补充文档治理阶段任务与历史计划说明

### Tag
- `v0.3.0-docs-split-archive` — 文档拆分编号与原型归档治理

## [0.2.2] - 2026-05-28

### Changed
- 全量升级 `docs/需求文档.md` 至 v2.0，覆盖产品定位、模块设计、验收标准、里程碑与技术实现建议
- 统一需求范围为分布式局域网/VPN 协作客户端，明确 P0/P1/P2 分阶段能力边界

### Tag
- `v0.2.2-prd-v2-full-refresh` — 需求文档升级为 v2.0 正式版本

## [0.2.1] - 2026-05-28

### Changed
- 将原型页面迁移至 `docs/`：`index.html` -> `docs/index.html`，`index2.html` -> `docs/index2.html`
- 同步更新 `README.md` 与 `plan.md` 中的原型路径引用

### Tag
- `v0.2.1-docs-prototype-layout` — 原型文件迁移至 docs 目录

## [0.2.0] - 2026-05-28

### Added
- 新增 `docs/需求文档.md`，明确 LanPM 下一阶段重构范围与 MVP 验收标准
- 新增 `index2.html` 作为原型迭代页面
- 新增 `archive/.gitkeep` 与 `.cursor/.gitkeep`，确保目录结构可被版本管理

### Tag
- `v0.2.0-prototype-iteration` — 原型需求文档与迭代页面基线

## [0.1.0] - 2026-05-28

### Added
- 以 `index.html` 为单文件原型：局域网项目管理系统（苹果风格 UI）
- 功能原型：聊天、看板、任务树、甘特图等界面骨架
- `plan.md`：苹果风格重构与四视角底部面板扩展计划
- `README.md`、`.gitignore`、Git 仓库初始化

### Tag
- `v0.1.0-prototype` — 可扩展需求前的基础原型基线
