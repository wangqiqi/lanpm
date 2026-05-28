# Changelog

本文件记录 LanPM 项目变更，最新条目在最上方。

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
