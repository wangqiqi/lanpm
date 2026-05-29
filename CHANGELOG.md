# Changelog

本文件记录 LanPM 项目变更，最新条目在最上方。

## [1.0.0-rc.50] - 2026-05-29

### Fixed
- **CI `verify:visual-screenshots`**：截图前等待甘特 SVG 条绘制；PNG 体积改为 `max(light,dark)≥41KB` 且双侧 `≥12KB`（亮主题压缩更小，避免误杀）

### Tag
- `v1.0.0-rc.50` — 视觉截图甘特 CI 门禁

## [1.0.0-rc.49] - 2026-05-29

### Removed
- **根目录 `视觉.md`**：视觉门禁以 `todo.md`、`docs/05` §2、`npm run verify:visual` 与 `.cursor/skills/lanpm-visual-audit` 为准（与 rc.36 归档策略一致）

### Tag
- `v1.0.0-rc.49` — 移除冗余视觉索引文件

## [1.0.0-rc.48] - 2026-05-29

### Fixed
- **CI Windows `verify:m0`**：移除 `verify:network-stub` 中 Unix 专用 `LANPM_NETWORK=stub` 前缀（该脚本直接测 `NetworkStub`，无需环境变量；cmd 会报 not recognized）

### Tag
- `v1.0.0-rc.48` — Windows verify:m7 m0 步骤修复

## [1.0.0-rc.47] - 2026-05-29

### Fixed
- **CI `postinstall`**：`ELECTRON_RUN_AS_NODE` 探测/脚本不再传入 Chromium 标志（`bad option: --no-sandbox`）；`--no-sandbox` 仅用于无头完整 Electron 启动（visual-screenshots / electron-smoke）

### Tag
- `v1.0.0-rc.47` — CI postinstall 与 Chromium 标志作用域修正

## [1.0.0-rc.46] - 2026-05-29

### Fixed
- **CI 三平台 `verify:m7`**：`resolve-electron-bin.mjs` 用 `require('electron')` 解析二进制（macOS `Electron.app` 路径）；`electron-ci-chromium-flags.mjs` 为 Linux GHA 无头 GUI 附加 `--no-sandbox` 等
- **CI `verify:visual-screenshots`**：无头 Electron 与 `verify:electron-smoke` 共用路径解析与 CI Chromium 标志
- **CI 生产构建**：`gantt-task-react` 精确别名至 CJS 入口，避免 Rolldown 解析 `index.modern.js` 子路径失败

### Changed
- **`udpDiscovery` / `NetworkStub`**：主进程 import 补全 `.ts` 扩展名（与 Node ESM 一致）

### Tag
- `v1.0.0-rc.46` — GitHub Actions 三平台回归与视觉截图门禁修复

## [1.0.0-rc.45] - 2026-05-29

### Added
- **顶栏「发现」**：`DiscoverModal` — 群组 Tab（局域网 `autoDiscover` 加入）+ 成员 Tab（点击私聊）
- **`discover:snapshot`** / **`group:join`** IPC；UDP/stub 发现包携带 `groups[]`
- **`verify:discover`**；`verify:release-gate` 与 `verify:m1` 串联

### Changed
- **`docs/01`–`05`/`08`/`README`**：RC 号、顶栏发现、DiscoveryPayload、双机手验步骤
- **`todo.md`**：`UX-DISCOVER` 完成；DOC-ACC-03 含发现联调

### Tag
- `v1.0.0-rc.45` — 局域网发现面板（群组 + 成员私聊）

## [1.0.0-rc.44] - 2026-05-29

### Added
- **`src/shared/appVersion.ts`**：从 `package.json` 读取 `LANPM_APP_VERSION`（构建期内联，Electron / 浏览器预览一致）
- **顶栏用户菜单 / 个人设置**：本机设备与 IP 下方展示软件版本号

### Changed
- **`scripts/dev-run.mjs`**：以 `node electron-vite/bin/electron-vite.js` 启动，避免 Windows 下 `npx.cmd` 路径差异
- **`onekey_run.bat`**：PID 数字校验、`echo` 写 pid/mode 文件、等待与菜单输出加固（CMD 兼容）
- **`onekey_run.ps1`**：与 bat 同步的运维输出与健壮性调整
- **i18n**：`topbar.versionWithNumber` / `profile.versionWithNumber`（中/英）
- **`README.md`**：当前 RC 号与 `package.json` 对齐

### Tag
- `v1.0.0-rc.44` — 用户菜单版本展示与 Windows 开发启动加固

## [1.0.0-rc.43] - 2026-05-29

### Added
- **`onekey_run.bat`**：Windows CMD 原生一键运维（taskkill/wmic/netstat，不依赖 PowerShell）
- **`onekey_run.ps1`**：Windows PowerShell 独立入口（与 bat/sh 并列）
- **`scripts/dev-run.mjs`**：跨平台 `npm run dev`（Windows 下清除 `ELECTRON_RUN_AS_NODE`，替代 Unix `env -u`）
- **`getLocalLanIp`**（`src/main/network/localIp.ts`）：智能选择局域网 IPv4（优先 WLAN/以太网，排除 VMware/VPN/198.18/169.254）
- **`NetworkStatusView.localIp`**：顶栏用户菜单与个人设置展示本机 IP
- **`tests/unit/network/localIp.test.ts`**：局域网 IP 评分与发现 host 解析单测

### Changed
- **`package.json`**：`dev` / `dev:web` 经 `scripts/dev-run.mjs` 启动（Windows 兼容）
- **`onekey_run.sh`**：Git Bash/Windows 兼容（无 `setsid` 时 fallback、`taskkill`/PowerShell 清理残留、electron-vite PID 追踪）；菜单提示 bat/ps1 分流
- **UDP discovery**：广播包携带 `host`；收包时 `resolvePeerHost` 优先对端自报局域网 IP
- **i18n**：`topbar.ipWithAddress` / `profile.ipWithAddress`（中/英）
- **浏览器桩**：`network.getStatus` 等返回 `localIp: null` 与 Electron 契约对齐
- **`README.md`**：Windows 开发入口说明

### Tag
- `v1.0.0-rc.43` — Windows 一键运维、局域网 IP 智能选择与发现增强

## [1.0.0-rc.42] - 2026-05-29

### Added
- **聊天侧栏**：可拖拽调宽（`lanpm-chat-sidebar-width`）、窄屏折叠；分区标题样式（`UX-CHAT-SIDEBAR`）
- **`isMemoryOnlyChatGroup`**：DM 与内存匿名群区分，离线同步/匿名判定不误伤私聊

### Changed
- **看板**：卡片标题 `--lanpm-font-title`、padding 与 hover 描边（`UX-BOARD-DENSITY`）
- **文件页**：上传/书签工具栏主次分层（`filesToolbar` / `filesToolbarSecondary`）
- **`regionInteract`**：hover 时 accent 环（`UX-BRAND`）
- **DM 成员显示名**：`getMemberDisplayName` 优先读本地用户资料
- **`todo.md`**：UX-SETUP / CHAT / BOARD / FILES / BRAND 审图项标完成

### Tag
- `v1.0.0-rc.42` — UI/UX polish（聊天侧栏、看板、文件、regionInteract）与 DM 同步修复

## [1.0.0-rc.41] - 2026-05-29

### Added
- **`identity:resetIdentity`**：顶栏用户菜单「注销身份」，清除本机设备绑定并回到 Setup（库内数据保留）

### Changed
- **Setup 向导**：表单行 `focus-within` 高亮；默认头像按亮/暗主题使用 accent（`defaultAvatarDataUrl`）
- **Setup 视觉**：Logo/头像 accent 描边环（`UX-SETUP-AVATAR` / `UX-SETUP-FORM` 部分落地）
- **`todo.md`**：UI/UX 审图评分与 UX 待办清单（`UX-RESET` 已勾）

### Tag
- `v1.0.0-rc.41` — 注销身份回 Setup、Setup 表单/头像 UX 加固

## [1.0.0-rc.40] - 2026-05-29

### Added
- **`identity:updateProfile`**：个人设置可修改显示名（2–20 字）与部门；保留 userId/后缀，保存后刷新局域网身份

### Changed
- **`ProfileModal`**：由只读 Descriptions 改为可编辑表单（DOC-F-04）
- **浏览器预览桩**：`identity.updateProfile` 与 Electron 对齐
- **`verify:profile-panel`**：校验 `updateProfile` 与 `baseName` 表单字段

### Tag
- `v1.0.0-rc.40` — 个人设置用户名/部门可保存

## [1.0.0-rc.39] - 2026-05-29

### Added
- **`archive/todo/20260529_174310_todo已完成项_rc37短期归档.md`**：已完成 todo 迁出
- **`archive/review/20260529_173500_V14b设计还原度审图_rc37.md`**：V-14b 七页审图报告
- **`视觉.md`**：视觉门禁索引（链向 `todo.md` / `archive/`）

### Changed
- **`todo.md`**：根目录仅保留未勾项（HOV / DOC-02 / 真机手验 / 1.0.0）
- **`visualCapture.ts`**：按主题 `setBackgroundColor`、`flushPaint`、截图前 `show()`
- **`main/index.ts`**：无头窗 `backgroundColor` + `paintWhenInitiallyHidden`
- **甘特**：`chartWrap` SVG 背景 `--lanpm-surface-solid`；`data-lanpm-visual="gantt-chart"`
- **`docs/05` §2.2–2.3**：审图勾选、甘特 PNG 与 `dev` 差异说明

### Tag
- `v1.0.0-rc.39` — todo 归档精简、V-14b 审图与截图管线加固

## [1.0.0-rc.38] - 2026-05-29

### Added
- **`verify:release-gate`**：发版聚合（`docs-code --strict` · visual · profile · project · m7 · 截图；Linux 自动 xvfb）
- **`docs/08_post-RC规划与已知限制.md`**：post-RC backlog 索引（DOC-TECH-02 / DOC-F-*）
- **CI** `visual-screenshots` job（ubuntu + xvfb）

### Changed
- **VIS-07b**：board/chat/gantt/tree/files/setup 业务 CSS 字号迁 `--lanpm-font-*`；`verify:visual` 守卫
- **V-14b-SEM**：看板优先级语义色、崩溃页令牌；`verify:visual` 扩展
- **`docs/05` §1.3** · **`docs/06` §2.5**：release-gate 与验收拆项
- **`todo.md`**：AUTO-20 / SEM / GNT / VIS-07b 勾选同步

### Tag
- `v1.0.0-rc.38` — 发版聚合门禁、VIS-07b 与 CI 视觉截图

## [1.0.0-rc.37] - 2026-05-29

### Added
- **`verify:profile-panel`**：顶栏 Profile 可打开 `ProfileModal`（DOC-F-04）
- **AUTO-20 甘特种子任务**：`visualCapture` 在 `demo-project` 写入带排期任务（`截图·设计评审`），看板/甘特截图非空态
- **`verify:visual-screenshots`**：`*_gantt.png` ≥ 41KB 守卫

### Changed
- **`verify:topbar`**：TopBar 网络点语义色令牌静态检查
- **`gantt.module.css`**：暗色 disabled 导出钮对比度（V-14b-SEM）
- **`docs/05` §2.2** · **`docs/06` §2.4–2.5**：种子任务说明、m7-perf 填表日期
- **`todo.md`**：AUTO-20 / V-14b-GNT / DOC-F-03~04 进度同步

### Tag
- `v1.0.0-rc.37` — 视觉截图甘特种子任务、Profile 守卫与验收文档同步

## [1.0.0-rc.36] - 2026-05-29

### Added
- **`archive/` 分目录**：`audit/`、`todo/`、`milestone/`、`review/`、`plan/`、`docs-meta/` + `README.md` 命名约定
- **`uiStore`**：监听 `lanpm-visual-theme`，无头截图同会话切换亮暗时同步 Ant 主题

### Changed
- **移除根目录** `视觉.md`、`代码文档差异.md`；审计报告迁至 `archive/audit/`，**`docs/`、`.cursor/` 不再引用 archive**
- **`todo.md`**：未完成项 SSOT；去掉报告索引废话
- **`visualCapture.ts`**：`applyTheme` + hash 导航减 full reload；隐藏窗用 `setTimeout` 轮询就绪；首屏后 `showInactive`
- **`verify:docs-code`**：§1 写入 `archive/audit/docs-code/`，保留 §2 尾段
- **Cursor skills / `docs/00–06`**：SSOT 仅 `docs/*` + `todo.md`

### Tag
- `v1.0.0-rc.36` — 归档目录整理、审计报告迁出根目录、视觉截图主题切换加固

## [1.0.0-rc.35] - 2026-05-29

### Added
- **AUTO-18** GitHub Actions 三平台 CI（ubuntu / macos / windows · `verify:m7`）
- **AUTO-20** `verify:visual-screenshots`：无头亮暗七页 PNG → `.lanpm/visual-screenshots/`（`visualCapture.ts` + `LANPM_VISUAL_CAPTURE_DIR`）

### Changed
- **VIS-08** 默认头像调色板与语义色 / accent 对齐（`setup/avatar.ts`）
- **路由 eager import**：`AppRouter` / `GroupView` 去除 lazy，避免截图时 Rolldown CJS 循环依赖
- **`main.tsx`**：`?theme=` 查询参数写入 localStorage（截图模式）
- **`main/index.ts`**：Linux 无头禁用加速视频编解码；截图模式隐藏窗口
- **`verify:visual`**：`regionInteract` hover/selected 令牌静态守卫
- **`代码文档差异.md`** §2 Agent 审计初版 · **`todo.md`** 已完成项归档精简
- **`docs/05`** · **`.gitignore`**：visual-screenshots 脚本说明与输出目录忽略

### Tag
- `v1.0.0-rc.35` — CI 矩阵、视觉截图自动化与 todo 归档

## [1.0.0-rc.34] - 2026-05-29

### Added
- **AUTO-19** `verify:electron-smoke`：无头 Electron 加载 `out/renderer`，确认 `#root` 挂载；`verify:project` 已串联

### Changed
- **VIS-07 字体尺度令牌**：`--lanpm-font-caption/body/title/display` 与 `--lanpm-line-*`；共享 UI / Setup / BottomNav 已迁移
- **VIS-FIX-01~04（暗色手验）**：甘特日历表头覆盖、任务条读 accent 令牌、看板优先级/里程碑改语义色、驾驶舱 1280×720 无横向溢出
- **`verify:visual`**：字体令牌、甘特/看板修复项守卫
- **`docs/04`** §1.5.1 字体尺度 · **`docs/05`** electron-smoke 说明
- **`todo.md`** · **`视觉.md`**：VIS-FIX / AUTO-19 / VIS-07 状态同步

### Tag
- `v1.0.0-rc.34` — 暗色视觉修复、字体令牌与 Electron smoke

## [1.0.0-rc.33] - 2026-05-29

### Added
- **语义/阴影设计令牌**：`--lanpm-success` / `warning` / `danger`、`--lanpm-on-accent`、`--lanpm-overlay`、`--lanpm-shadow-sm/md/lg`（亮暗双主题）
- **`crash.module.css`**：渲染崩溃页用语义令牌，跟随 `data-theme`

### Changed
- **视觉阶段 A（VIS-01~03）**：TopBar/看板/聊天/文件/甘特/Setup 去除 Ant 语义色与错误 rgba fallback；扩展 `verify:visual` 守卫
- **视觉阶段 B（VIS-04~06）**：`docs/04` §1.3 圆角尺度；`main.tsx` 启动失败页随主题；`App` 顶栏边框；甘特导出背景读 `--lanpm-bg`
- **`verify:project`**：串联 `verify:docs-code -- --strict`
- **`todo.md`** · **`视觉.md`**：待办与审计状态同步

### Tag
- `v1.0.0-rc.33` — 视觉语义令牌与阶段 A/B 整改

## [1.0.0-rc.32] - 2026-05-29

### Added
- **`verify:docs-code`**：文档↔代码机读一致性检查，输出 `代码文档差异.md`（`--strict` 门禁）
- **Cursor `lanpm-docs-code-audit` skill**：全量文档/实现审计工作流

### Changed
- **`.cursor/README.md`** · **`lanpm-visual-audit`** · **`视觉.md`** · **`todo.md`**：视觉与文档审计分工说明

### Tag
- `v1.0.0-rc.32` — 文档代码一致性守卫与 docs-code-audit skill

## [1.0.0-rc.31] - 2026-05-29

### Added
- **Cursor 视觉门禁**：`.cursor/skills/lanpm-visual-audit` · `.cursor/rules/renderer-visual-tokens.mdc` · `release-visual-gate.mdc`

### Changed
- **`.gitignore`**：忽略 Vitest 临时目录 `coverage/`
- **`视觉.md`** · **`todo.md`**：补充 Cursor Agent 视觉审计说明

### Tag
- `v1.0.0-rc.31` — coverage 忽略与 Cursor 视觉门禁配置

## [1.0.0-rc.30] - 2026-05-29

### Added
- **AUTO-13** `verify:offline-sync-integration`：chat_sync_request → chat_sync_batch → SQLite 落库 + TTL 过滤
- **AUTO-14** `verify:file-concurrency`：`FILE_MAX_CONCURRENT` + `countActiveTransfers` 边界
- **AUTO-15** 扩展 `verify:m7-perf`：500 条消息分页 P95 门禁
- **AUTO-16** `verify:coverage`：`src/shared` 覆盖率阈值（lines/functions/statements ≥85%，branches ≥80%）
- **AUTO-17** 扩展 `verify:visual`：七页视图 token 守卫 + 亮/暗主题差异断言

### Changed
- **`verify:project`**：`npm run test` → `verify:coverage`（含阈值）
- **`verify:m7`**：串联 offline-sync-integration · file-concurrency

### Tag
- `v1.0.0-rc.30` — P2 稳定性/边界自动化守卫

## [1.0.0-rc.29] - 2026-05-29

### Added
- **AUTO-01~09 / AUTO-06 / AUTO-12**：P0 一致性守卫（`verify:p0`：IPC 契约 · i18n 键 · 文档链接 · RC 现状 · 路由 · Stub parity · sync handler · schema）
- **AUTO-10** `verify:dual-stub`：单机双 Stub 联调（discover + chat + read_receipt + task_patch），纳入 `verify:m2`
- **AUTO-12** `verify:peer-registry`：Stub peer TTL / excludeDeviceId，纳入 `verify:m0`
- **`verify:project`**：串联 `verify:p0` + `npm run build`（AUTO-04/11）

### Tag
- `v1.0.0-rc.29` — P0/P1 自动化一致性守卫与双 Stub 联调

## [1.0.0-rc.28] - 2026-05-29

### Added
- **Vitest 扩展**：`ganttAdapter` · `aiProviders` · `presence/display`（**22 文件 / 92 用例**）

### Changed
- **`verify:project`**：串联 `verify:shared`
- **`todo.md`**：单元测试矩阵与待补项更新

### Fixed
- **`ganttAdapter.test.ts`**：`TaskDependency` 用例与类型定义对齐

### Tag
- `v1.0.0-rc.28` — Vitest 扩展与 verify:project 串联 shared

## [1.0.0-rc.27] - 2026-05-29

### Changed
- **verify 脚本目录重组**：31 个 `verify-*` 迁入 `tests/static/`、`tests/integration/`、`tests/runners/`；`tests/projectRoot.ts`；`npm run verify:*` 命令名不变
- **文档体系合并为 6+1**：`01` PRD · `02` 技术（含原 `11` §13.6）· `03` 数据（原 `04`）· `04` UI（原 `05`）· `05` 测试与联调发布（原 `06`/`09`/`10`）· `06` 验收与 RC（原 `03`/`08`）；`07` M3 全文 → `archive/`
- **`docs/00`**、**README**、**`verify:project`**、**`todo.md`**：链接同步

### Removed
- 独立文件 `docs/07`–`docs/11` 及旧编号重复篇（见 `archive/20260529_160500_文档12篇合并为6加1_归档说明.md`）

### Tag
- `v1.0.0-rc.27` — 文档 12 篇合并为 6+1

## [1.0.0-rc.26] - 2026-05-29

### Added
- **`docs/11_网络与手动添加节点.md`**：ARCH-02「添加节点」产品说明、UI 入口、`host:port` 规则、默认端口、实现路径、排错与测试命令

### Changed
- **`docs/00`** / **`docs/02` §13.2** / **`docs/05` §4** / **`docs/06` §1.4·§4.2** / **README**：交叉引用与 Stub/真网手验步骤

### Tag
- `v1.0.0-rc.26` — 手动添加节点专题文档

## [1.0.0-rc.25] - 2026-05-29

### Added
- **Vitest 单元测试扩展**：`tests/unit/` 新增 chat（dmSession / detectLanguage / readReceipt）、file（bookmarks / formatFileType / inferCategory）、task（validation / kanban）、presence、group、network、identity（**19 文件 / 76 用例**）
- **`npm run verify:shared`**：纯 shared 冒烟串联；`package.json` 暴露 **`verify:preview-extensions`** / **`verify:format-file-type`**
- **`todo.md`**：测试体系清单（单元 + 集成 + 待补项）

### Changed
- **`.npmrc`**：`legacy-peer-deps=true`，修复 `vite@8` 与 `@vitejs/plugin-react` 的 peer 冲突导致 `npm install` / Vitest 不可用
- **README** / **`docs/10`**：补充 `npm run test`、`verify:shared` 与单元测试矩阵

### Tag
- `v1.0.0-rc.25` — 单元测试扩展、verify:shared 与 npm 依赖安装修复

## [1.0.0-rc.24] - 2026-05-29

### Added
- **Vitest 单元测试**：`vitest.config.ts` + `tests/unit/`（chat / file / navigation / task，23 用例）
- **`npm run test`** / `test:watch` / `test:coverage`；纳入 `verify:m7` 与 `verify:project`
- **`docs/10_测试体系说明.md`**：单元 / 集成 / 全量 / 手验分层与命令索引
- **`scripts/verify-format-file-type.ts`**：`formatFileTypeLabel` 冒烟脚本

### Changed
- **FilesView**：表头排序修复（`columnKey` 解析 + 取消排序时同列 ascend/descend 切换）；列 `dataIndex` + 客户端 `sorter`；默认按上传时间降序
- **FilesView**：搜索框与结果计数；预览区展示类型/大小/时间；预览侧栏下载按钮
- **I18N-05**：`resolveGroupDisplayNameById` — 演示群、私聊群名、崩溃页文案按 locale 解析；浏览器 stub 演示群名走 `stubT`
- **`verify-dm`**：移除已废弃的 `formatDmTitle` 断言

### Tag
- `v1.0.0-rc.24` — Vitest 单元测试、FilesView 排序修复与 I18N 展示层

## [1.0.0-rc.23] - 2026-05-29

### Added
- **B-01** 任务 P2P 同步：`taskSyncService` 发布/订阅 `task_patch`（LWW by `updatedAt`）
- **B-02** 远端文件 P2P 下载：`fileSyncService`（`file_meta` / `file_pull_request` / `file_chunk`）+ FilesView「从局域网下载」+ `file:pullRemote`
- 聊天**区域截图**发送：`electron-screenshots` + `chat:captureScreenshot` IPC
- 文件**另存为**下载：`file:download` IPC + FilesView 下载按钮
- **`previewExtensions`**：预览扩展名集中定义 + `verify:preview-extensions`
- **`verify:task-sync`** / **`verify:file-sync`**，纳入 `verify:m7`
- **`systemDialog`**：文件对话框统一父窗口，避免截图 overlay 遮挡

### Changed
- **`todo.md`** 仅保留 6 项手验待办；已完成全量迁入 `archive/20260529_140842_todo已完成项全量归档.md`
- **`docs/` / `README`**：文档互链限定 `docs/` 目录，去除对 `todo.md` / `archive/` 的引用
- 书签/聊天/文件选路经 `systemDialog`；`mainWindow` 模块供截图与对话框定位

### Tag
- `v1.0.0-rc.23` — 任务/文件 P2P 同步、聊天截图、todo 归档与文档清理

## [1.0.0-rc.22] - 2026-05-29

### Added
- **ARCH-03** UDP 组播发现：`239.255.43.123:43123` 与广播并用（`LANPM_DISABLE_MULTICAST=1` 可关）
- **`verify:network-multicast`** / **`verify:i18n-en`**（en-US 无 CJK），纳入 `verify:m7`

### Changed
- **B-04** 决策文档化：v1.0 维持 TCP+UDP，WebRTC 为 v1.1 可选（`docs/01`、`docs/08`）
- **UX-R-01** `docs/05` §1.5 窄窗口断点表（UX-R-02~06 汇总）
- **`docs/08` §16.11** 回填 `verify:m7-perf` 自动化指标；更新已知限制表

### Tag
- `v1.0.0-rc.22` — 组播发现、B-04 决策、RC 文档回填

## [1.0.0-rc.21] - 2026-05-29

### Added
- **ARCH-07 / PRD-F-07** 离线 7 天补同步：`chat_sync_request` / `chat_sync_batch` 报文 + `offlineSyncService`（重连/初始化时拉取）
- **PRD-F-10** 文件断点续传：`file:resumeTransfer` IPC，从 `transferredBytes` 续传
- **PRD-F-11** 传输限速：FilesView KB/s 配置 + `chunkDelayMs` 分片节流
- **PRD-F-12** 传输历史：FilesView 折叠历史列表 + 失败/暂停「续传」
- **`verify:offline-sync`**：TTL  cutoff 与限速延迟脚本

### Changed
- **ARCH-05 / ARCH-08** 文档对齐：`docs/01` §1.3.1 / README — RC 以 SQLite 为唯一持久化层；库级加密 post-RC
- **Native 依赖**：`ensure-native-deps.mjs` + `run-electron-node.mjs`；`predev`/`prebuild` 自动检测 better-sqlite3；含 SQLite 的 `verify:*` 改走 Electron Node（`docs/08` 更新）

### Tag
- `v1.0.0-rc.21` — 离线补同步、文件续传/限速/历史

## [1.0.0-rc.20] - 2026-05-29

### Added
- **ARCH-02** 手动添加节点：`network:connectManualPeer` IPC + 顶栏网络菜单 `ManualPeerModal`（`host:port` 建链；Stub 登记 peer 文件）
- **ARCH-01** 群组密钥 24h 轮换：`groupKeyService` 处理 `group_key_rotate` 报文并按群定时发布轮换通知（`sync_meta` 存 `keyVersion`）
- **PRD-F-02** 聊天文件发送：`chat:pickAndSendFile` / `chat:sendFile`；`ChatView` 附件按钮 + 拖拽上传；`MessageBubble` 文件消息展示
- **`verify:network-manual`**：`parseHostPort` 单元脚本

### Fixed
- **`verify:visual`**：`emojiPicker.module.css` 移除硬编码 Ant Design 蓝色 fallback

### Tag
- `v1.0.0-rc.20` — 手动节点、群组密钥轮换协议、聊天发文件

## [1.0.0-rc.19] - 2026-05-29

### Added
- **文本文件内联预览**（**PRD-F-04** 延伸）：`file:getPreviewText` IPC + `loadPreviewText`；`.txt` / `.md` / `.json` 以 `<pre>` 展示
- **`lanpm-preview://` 自定义协议**：主进程 `previewProtocol.ts` 注册预览协议，替代 `file://` iframe，解决 Electron 开发态跨协议拦截
- **甘特拖拽配置**（`ganttDragConfig.ts`）：加宽拖动手柄（12px）、日视图列宽 72px、拖拽步进对齐日粒度
- **`docs/05`** §6.0：看板 / 任务树 / 甘特「内容统一、交互分视图」约定

### Changed
- **文件分类**：`.txt` / `.json` 归入 `code` 类别
- **甘特图**：`locale` 跟随应用语言；拖条改期后抑制误触单击弹窗；`updateSchedule` 乐观更新本地任务列表
- **启动时** `repairFilePreviewPaths` 修复历史 `preview_path` 为空记录

### Fixed
- **文本预览失败**：上传后 `preview_path` 被二次写入清空；`file://` iframe / fetch 在 `http://localhost` 下不可用 → 改 IPC + 自定义协议
- **preload 未热更新**：`loadPreviewText` 在缺少 `getPreviewText` 时回退 `getPreviewUrl` + fetch

### Tag
- `v1.0.0-rc.19` — 文本文件预览修复、lanpm-preview 协议与甘特拖拽优化

## [1.0.0-rc.18] - 2026-05-29

### Added
- **看板任务编辑**（**PRD-F-01** 延伸）：`TaskEditModal` 双击卡片打开；`KanbanCard` 统一「⋯」菜单（编辑 / 讨论 / 移列 / 删除）
- **任务详情字段补全**：`TaskDetailPanel` 增加开始日期、进度、里程碑、OTHER 原因；导出 `TaskDetailSaveInput` 供看板/树共用
- **i18n**：`board.toolbarHint`、`board.moveToColumn`、`board.cardMenuAria`

### Changed
- **看板工具栏**：非空看板显示操作提示；空看板仅保留空态 CTA；创建任务 Modal 改为 `Form` 纵向布局
- **`KanbanCard`**：移除卡片内「讨论」链接与独立删除按钮，操作收入下拉菜单

### Tag
- `v1.0.0-rc.18` — 看板双击编辑、卡片统一菜单与任务详情字段补全

## [1.0.0-rc.17] - 2026-05-29

### Added
- **聊天表情**（**P1-CHAT-01**）：`EmojiPicker` Popover + 常用表情网格插入输入框
- **书签内嵌 WebView**（**PRD-F-03** / **P1-FILES-01**）：`BookmarkWebView`；主进程 `webviewTag: true`；浏览器预览降级外链提示
- **看板列内排序**（**B-03**）：卡片互拖落点 + `sortOrder` 重编号持久化（`@dnd-kit/core`）
- **Stub i18n**（**I18N-06** / **UX-I-07**）：`stubTranslate` + `stub.*` 键替换 `browserLanpmStub` 硬编码中文

### Changed
- **`todo.md`**：未完成置顶、已完成归档至文末；勾选 **P1-CHAT-01**、**P1-FILES-01**、**B-03**、**PRD-F-03**、**I18N-06**、**UX-I-07**

### Tag
- `v1.0.0-rc.17` — 聊天表情、书签 WebView、看板列内排序与 Stub i18n

## [1.0.0-rc.16] - 2026-05-29

### Added
- **任务树详情面板**（**PRD-F-01**）：`TaskDetailPanel` 右侧编辑名称/负责人/状态/优先级/截止/描述，保存与删除；搜索高亮自动选中
- **看板拖入垃圾桶删除**（**PRD-F-06**）：`KANBAN_TRASH_DROP_ID` + `TrashDropZone`；里程碑 Tag
- **文件视频预览**（**PRD-F-04**）：`.mp4` / `.webm` 内嵌 `<video controls>`
- **i18n**：`tree.detail*`、`board.trashDrop` / `board.milestone`、`chat.openSidebar` / `chat.closeSidebar`

### Changed
- **窄屏响应式**（**UX-R-03~05**）：聊天侧栏 `≤900px` 抽屉；看板 `≤1100px` 纵向堆叠；文件 `≤960px` 单栏预览
- **`todo.md`**：勾选 **PRD-F-01/04/06/09**、**UX-R-03~05**

### Tag
- `v1.0.0-rc.16` — 任务树详情面板、看板垃圾桶拖删、视频预览与窄屏布局

## [1.0.0-rc.15] - 2026-05-29

### Added
- **看板卡片截止日期**（**PRD-F-06** 部分）：`KanbanCard` 展示 `endDate`（`board.dueDate` i18n）
- **i18n**：`chat.notification*`（浏览器 @ 提及通知）、`files.categoryFilter`、`gantt.viewModeAria`

### Changed
- **TopBar**（**UX-INT-04** / **UX-R-02**）：`RegionButton` 替换 Ant `Button type="text"`；`≤1100px` 双行 `flex-wrap`（`barSection`）
- **文件 / 甘特工具栏**（**UX-INT-05/06**）：`ViewSegment` 替代 `Segmented` / `Radio.Group`，统一区域 hover/active/选中
- **成员列表**（**UX-INT-03**）：整行 hover/active token；`dmBtn` 按下态
- **BottomNav**（**UX-INT-10**）：`tabWrap` 通过 `composes` 复用 `regionInteract.module.css`
- **`verify:visual`**：守卫 `RegionButton` / `RegionTabBar` / `ViewSegment` 与 BottomNav composes；高亮动画移除 Ant 蓝 `#1677ff` 回退色
- **`docs/05`** §1.3 交互区域约定；**`docs/09`** 补充 DM/成员/ViewSegment/顶栏手验检查点
- **`todo.md`**：勾选 **UX-INT-03~10**、**UX-R-02**、**UX-I-08**；**PRD-F-06** 标注部分完成

### Fixed
- **甘特导出失败**：toast 统一 `gantt.exportFailed`，不再暴露内部英文错误串

### Tag
- `v1.0.0-rc.15` — 交互区域 UX-INT 收尾、TopBar 窄屏与看板截止日期

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
- M7 全量回归：`npm run verify:m7`（`ensure:native` → M0–M7；SQLite 脚本走 Electron Node）
- `scripts/ensure-native-deps.mjs`：`postinstall` / `predev` / `prebuild` 自动对齐 better-sqlite3 ↔ Electron ABI
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
