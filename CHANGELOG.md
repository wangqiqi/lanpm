# Changelog

本文件记录 LanPM 项目变更，最新条目在最上方。

## [Unreleased]

### Added

- **Linux `--full` 性能抽样**：本机 Ubuntu `measure:perf --full`（冷启动×3 · idle 60s · Tab×10）；median 冷启动 790ms；idle RSS≈607MB（关 GPU，**不对标** 200MB）；Tab P95 152ms（`TASK-6101`）

## [1.106.0] - 2026-08-21

### Added

- **Office 轻量预览（主进程）**：无 LibreOffice 时 `docx`/`xlsx` 用 mammoth / exceljs 写出 HTML 预览；有 `soffice` 仍先转 PDF（`TASK-5801`）
- **文件库 HTML 预览**：docx/xlsx 轻量预览走沙箱 iframe（无 script）；soffice PDF 仍走 `PdfPreview`（`TASK-5802`）
- **Office 预览口径**：`docs/06` §6.1 #8 标 mammoth/exceljs 轻量切片已交付；浏览器 stub 不转 Office（`TASK-5803`）
- **Office 预览门禁**：`verify:office-preview` 并入 `verify:p0` / release-gate（`TASK-5804`）
- **甘特任务表导出**：工具栏导出 Markdown（给人/模型）与 CSV（给表格软件）；PNG/PDF 图导出保留（`TASK-5901` · `TASK-5902`）
- **甘特 B5 口径**：`docs/06` 标任务表 MD/CSV 已交付；图导出仍是 html2canvas（`TASK-5903`）
- **甘特表导出门禁**：`verify:gantt-table-export` 并入 `verify:p0`（`TASK-5904`）
- **四页长列表灌数**：`measure-seed-lists` 给 demo-project 补消息/任务/文件，并露出甘特/文件 Tab；四页滚动容器带 testid（`TASK-6001`）
- **四页长列表滚动测量**：`measure:list-scroll` 灌数后滚聊天/看板/文件/甘特；P95≥50ms 或长任务≥50ms 才 GO 装 virtuoso（`TASK-6002`）
- **长列表测量（Linux）**：聊天/看板/文件/甘特均可滚；滚动 rAF P95≈16.7ms、无 longtask；**NO-GO** 不装 virtuoso（`TASK-6003`）
- **长列表口径**：`docs/06` §6.1 #3 / `docs/05` §5 记 SPRINT-60 **NO-GO**；`verify:list-scroll` 入 `verify:p0`（`TASK-6004`）

## [1.105.0] - 2026-08-21

### Added

- **可购周报壳**：`lanpm.weekly`（`pricing: paid`）；默认关闭，不拆卖驾驶舱数字看板（`TASK-5701`）
- **周报/月报许可闸**：`generateWeeklyReport` / `generateMonthlyReport` 走 `assertPaidPluginLicensed`；评语接口仍免费（`TASK-5702`）
- **驾驶舱周报 CTA**：无许可周报/月报按钮引导扩展页；授权后仍可生成并复制 Markdown（`TASK-5703`）
- **周报 SKU 口径**：`docs/06` §6.3 第二波标周报导出薄切片已交付；驾驶舱数字仍不拆卖（`TASK-5704`）
- **可购敏捷包壳**：`lanpm.agile`（`pricing: paid`，Slot `board.toolbar` / `board.card.footer`）；默认关闭，不拆卖看板（`TASK-5601`）
- **敏捷许可闸**：看板工具条无许可证显示 CTA；不展示故事点（`TASK-5602`）
- **故事点字段**：`tasks.story_points` + CRDT `storyPoints`（1–99，可空）；走任务同步（`TASK-5603`）
- **估点走 Host patch**：`task.patch` 白名单含 `storyPoints`，无许可仍被 `assertPaidPluginLicensed` 拦住（`TASK-5604`）
- **看板故事点**：授权后卡片可估 1–99 点，工具条按列合计；未估不计入（`TASK-5605`）
- **敏捷 SKU 口径**：`docs/06` §6.3 第二波标故事点薄切片已交付；核心看板仍不拆卖（`TASK-5606`）
- **可购高级排程壳**：`lanpm.schedule`（`pricing: paid`，Slot `gantt.toolbar`）；默认关闭，不拆卖基础甘特（`TASK-5401`）
- **高级排程许可闸**：甘特工具条无许可证显示 CTA；`task.list` 等能力仍走 Host `assertPaidPluginLicensed`（`TASK-5402`）
- **FS 关键路径**：纯函数按已有 FS 依赖算最长工期链；环/无日期/无 FS 返回空（`TASK-5403`）
- **甘特关键路径开关**：授权后工具条 Switch；高亮用 accent 令牌，空链/成环有提示（`TASK-5404`）
- **排程 SKU 口径**：`docs/06` §6.3 第二波标排程薄切片已交付；核心甘特仍不拆卖（`TASK-5405`）
- **匿名群本机历史**：匿名群文本消息写入 SQLite（召回/编辑同路径）；离线 `chat_sync` 仍跳过，不从对端补历史（`TASK-5202`）
- **匿名群退出再进**：leave/enter 不再清空本机消息；解散仍 cascade 删除；提示文案与 docs/01·03·06 对齐（`TASK-5203`）
- **会议旁路运维**：`docs/07` 会议节增加本机/内网 LiveKit 最短步骤，指向 `plugins/lanpm.meeting/deploy/docker-compose.yml`（`TASK-5103`）

### Changed

- **会议 Pro 视频格**：Popover 内 `auto-fit` 列；投屏格跨整行并以 `--lanpm-accent` 描边突出（`TASK-5301`）
- **会议 Pro 标签 i18n**：投屏格与参会者「本机 / 已静音」走 locales，不再硬编码英文（`TASK-5302`）
- **会议 ROADMAP Pro+**：`docs/06` §3.2/§3.3/§3.5 将 Popover 格/投屏/i18n 标已交付（SPRINT-53）；真多人/全屏仍后置（`TASK-5303`）
- **会议档位**：工具栏主菜单同时展示 Lite mesh 与 Pro（LiveKit SFU）分区；旁路未配置 / 缺 SDK 时给出可读失败文案与配置引导（`TASK-5102`）
- **会议入口**：未启用会议插件时聊天工具条显示升级引导（打开扩展页）；未购许可时主菜单展示许可证 CTA，Join / Pro Join 禁用且不会走 mesh/LiveKit 入会（`TASK-5101`）
- **会议 ROADMAP**：`docs/06` §3.3 改为 SPRINT-51 交付说明（CTA · Lite/Pro 可见 · LiveKit 最短运维），不再写成未做的「深化」；`verify:meeting-ux` 锁住本 Sprint 守卫（`TASK-5104`）
- **B6 / 匿名口径**：`docs/06` 去掉未做的表情 P1 行；§6.1 #7 与 B6 标已交付；匿名群本机留史（`TASK-5204`）

## [1.104.0] - 2026-08-20

### Added

- **英文无头截图**：`LANPM_VISUAL_LOCALE=en-US` + `LANPM_VISUAL_SLUGS`；`npm run verify:visual-screenshots-en` 产出 cockpit/chat 英文 PNG（`TASK-4901`）
- **文件库索引离线补拉**：对端离线期间上传的文件，重连后会出现在文件列表（`remote-pending`）；下载本体仍要点「从局域网下载」（`TASK-4801`–`TASK-4805`）

### Changed

- **Linux GPU-on 对照（`--quick`）**：本机 default-off RSS 空闲≈634MB vs `LANPM_ENABLE_GPU=1`≈857MB；**不改默认、不对标 200MB**（`TASK-5001`–`TASK-5004`）
- **英文 cockpit/chat 折行**：无头 `en-US` 截图无整页横向溢出；驾驶舱动作区 / 聊天输入岛补 `min-width: 0`（`TASK-4902`）
- **ROADMAP 英文折行**：`docs/06` §4 #9 闭合 cockpit/chat 肉眼缺口；`verify:visual-screenshots-en` 入 `docs/05`（`TASK-4904`）
- **README 配图**：同步本机最新亮色截图（含协作抽屉 92vw 与脑图 `assets/mindmap.png`）

### Fixed

- **`measure:perf` 底栏 Tab**：默认只切 chat / board / tree（甘特/日历默认藏）（`TASK-5002`）

## [1.103.2] - 2026-08-20

### Fixed

- **协作抽屉宽度**：聊天侧栏开着时，文件 / 白板 / 脑图统一为 `92vw`（原先 720px / 92vw / 80vw 不一致）
- **发版门禁**：eslint 未用信封 `payload` 绑定；pdfjs 6 `PDFDocumentProxy` 改 `cleanup()`；`file_chunk` 处理收窄 `fileId`（`TASK-4701`）
- **顶栏未知插件文案**：`lanpm.ai-assistant` 已声明 `topbar.menu` 但无槽位组件，亮暗截图顶栏出现「未知插件 UI」；现注册空 stub，入口仍走原生「AI 助手」（`TASK-4703`）

### Changed

- **质量走查（Linux）**：`verify:release-gate`（含 m7）+ Playwright `e2e-views` + `i18n-keys`/`i18n-en` + 20 张亮暗 PNG；顶栏去掉未知插件文案（`TASK-4701`–`TASK-4705`）
- **`verify:visual`**：`AppRouter` 允许驾驶舱 `lazy()`（对齐 `TASK-3003`），仍禁止 `GroupView` 懒加载以免 Rolldown CJS 循环（`TASK-3805`）

## [1.103.1] - 2026-08-20

### Added

- **群标签离线补拉**：重连后按 LWW 补字典色板（`group_tag_sync_request` / `_batch`），对端离线时改的标签色不再丢（`TASK-4101`–`TASK-4105`）
- **文件库 PDF 预览**：原生 PDF（及 soffice 转出的 PDF）用 `pdfjs-dist` 翻页，不再走 Chromium iframe（`TASK-4001`–`TASK-4005`）
- **会议日程可编辑**：近期预约可改标题/时间/时长（`updateSchedule`），不必删了再建（`TASK-3701`–`TASK-3705`）
- **`npm run measure:perf`**：Linux 上对 electron-vite 生产构建采集冷启动、RSS、底栏 Tab P95、明文 vs SQLCipher 查询对照；JSON 在 `.lanpm/perf/`（`TASK-2901`–`TASK-2906`）
- **本机 SQLite 可选通行词加密**（at rest）：明文库默认可用；设置里加密；错口令不建空库（`SPIKE-2701` · `TASK-2701`–`TASK-2705`）
- **脑图实时协同**：打开中的文档走 Yjs `mindmap_crdt` / awareness / 离线 SV（对标白板；文档列表仍本机）（`SPIKE-2601` · `TASK-2601`–`TASK-2607`）
- 根目录 `README.html`：`README.md` 的 HTML 导出，便于离线浏览

### Security

- **库加密解锁窗**：preload + `contextIsolation`，窗内不再 `require('electron')`；`finish` 只结算一次（at-rest `TASK-2801`）
- **profile 迁库**：加密 `lanpm.db` 不再无 key 裸开 SQLite（at-rest `TASK-2802`）
- **通行词**：桌面/CLI 共用 `resolveDbPassphrase`；关库清 session 口令（at-rest `TASK-2803`）
- **文件上传**：renderer / 插件不得再传本机绝对路径；仅主进程文件对话框（`TASK-2701`）
- **P2P 信封**：缺密封字段一律丢弃，不再明文放行（`TASK-2702`）
- **路径**：`groupId` / 文件名拒绝 `..` 穿越（`TASK-2703`）
- **插件**：侧载不得覆盖同 id 内置插件；打包忽略 skip-verify 环境变量（`TASK-2704`）
- **人审**：`ops.command.send` · `chat.sendTaskRef` · `media.livekit.createToken` 须确认；Gateway 禁用 query `?token=`，改 timing-safe Bearer / WS subprotocol（`TASK-2705`）
- **P2P 握手**：`deviceId` 钉死 ECDH 公钥（pairing / TOFU / peer file）；已钉钥被替换则拒绝 `ready`；配对材料混入 AES KDF（`TASK-2801`–`TASK-2807`）

### Changed

- **P2P `file_chunk` 方案 B**：双方 handshake 声明 `envBin` 后，TCP 密文走 `envelope_bin`（小 JSON 头 + 原始 AES-GCM 字节），不再塞进 JSON `__enc` Base64。旧对端仍 JSON 信封（`TASK-4201`–`TASK-4205`）
- **全局搜索引擎**：任务/消息命中改走 OSS `minisearch`（MIT）；不再用 SQL `LIKE` 当主路径。成员检索仍内存匹配。IPC 形状不变（`TASK-3901`–`TASK-3905`）
- **白板/脑图永不进底栏**：sanitize 强制隐藏；Profile 导航列表不再给出开关。深链与 Composer 抽屉不变。文件库仍可按偏好开 Tab（`TASK-4601`–`TASK-4605`）
- **许可路径 SPIKE**：建议维持 AGPL-only；有闭源 OEM 先合同例外，常规产品线再双许可。插件离线闸不变。LICENSE 未改（SPIKE-3601–SPIKE-3603）
- **底栏默认三 Tab**：项目群默认聊天 / 看板 / 树；甘特与日历默认藏（Profile 导航可开）。仍为 v1.96「只藏 files+whiteboard」的偏好会补藏时间透镜；已自定义隐藏集不迁（`TASK-4501`–`TASK-4505`）
- **对外叙事（真网）**：`verify:m6` 标明本机 loopback；双机手验仍走 docs/05 §6，CI 未跑（`TASK-3501`–`TASK-3503`）
- **P2P `file_chunk` 双栈**：拉取可声明 `chunkEncoding: 'binary'`，密封明文为小 JSON 头 + 原始片；未声明仍走 `chunkBase64`。本机新客户端默认请求 binary（`TASK-3401`–`TASK-3404`）
- **Linux GPU**：默认仍关闭硬件加速；`LANPM_ENABLE_GPU=1` 可 opt-in 以便对照 RSS（无 Vulkan 会 FATAL）（`TASK-3201`–`TASK-3204`）
- **SQLite at-rest 探测**：只读 16 字节文件头，加密/明文判断不再整库读入（`TASK-3101`）
- **任务列表**：创建/更新/移动/聊天建任务后本地 upsert，不再整群 `listTasks`；删除级联与依赖边仍刷新（`TASK-3102` · `TASK-3103`）
- **群视图分包**：看板 / 树 / 文件与甘特等同 `lazy()`；驾驶舱路由懒加载（首次切入有 Spinner，二次切换不受此限）（`TASK-3002` · `TASK-3003`）
- **驾驶舱仪表盘**：项目任务与部门一次 JOIN，去掉按群 N+1 查询（`TASK-3004`）
- **文件拉取进度**：chunk 进度广播节流 100ms；完成/失败仍立即刷新（`TASK-3005`）
- README / README.zh-CN：已钉钥防 MITM；首次发现仍 TOFU（`TASK-2807`）
- **安全（行为摘要）**：路径段 `shared/fs/safeSegment`；网关仅 Bearer + `timingSafeEqual`（去掉 query `token`）；破坏性 IPC 走确认框；未密封信封抛错；sideload 不得覆盖 builtin；打包 Host 不跳过插件签名；上传只走系统选择框（细节见上节 Security）
- **浏览器 stub**：补 `chat.sendTaskRef` / `ops.command.send` / `media.livekit.createToken` 写能力

### Fixed

- **文件落盘**：`groupId` / 文件名经 `resolveSafePath`，降低路径穿越风险

## [1.103.0] - 2026-08-01

### Added

- **设计令牌**：`--lanpm-border-subtle` · `--lanpm-motion-slow` · `--lanpm-ease-emphasized`（亮暗成对）
- **动效**：协作抽屉内容 `collaborationPanelReady` 淡入；全局 `prefers-reduced-motion` 降级
- **Ant 动效对齐**：`ThemeProvider` `motionDurationFast/Mid/Slow`（`TASK-2508`）

### Changed

- **壳层**：底栏 Tab / 顶栏次要操作去掉 `opacity` 弱化，改用语义色（`TASK-2502`）
- **甘特工具栏**：去除重复「导出 PNG」，保留 PDF + `ViewExportShareActions`（`TASK-2505`）
- **协作抽屉**：白板 `transform:none` 仅作用于 `collaborationDrawerWhiteboard`（`TASK-2504`）
- **对比度**：暗色 `--lanpm-text-tertiary` 提亮；Setup 禁用按钮改 fill-secondary（`TASK-2507`）
- **字号**：plugin / taskAwareness / NavPreferences / aiAssistant 离散 px → token（`TASK-2501`）
- **docs/04** §1.6 动效表；截图基线刷新（`TASK-2509` · `TASK-2510`）

## [1.102.1] - 2026-08-01

### Added

- **E2E 扩展**：`verify:e2e-views-expand` — gantt/calendar 深链岛屿 + 协作抽屉 files/whiteboard/mindmap + `mindmap-toolbar`（`SPIKE-2401` · `TASK-2403`–`TASK-2406`）
- **协作入口 testid**：`collab-open-files` · `collab-open-whiteboard` · `collab-open-mindmap`（`TASK-2402`）

### Fixed

- **协作抽屉**：切换文件库/白板/脑图时 `drawerReady` 未恢复导致面板卡在 Spinner（`ChatCollaborationDrawer.tsx`）
- **脑图 CSS**：补全 `.mindmapHost` 选择器（`plugin.module.css` 构建阻断）
- **白板 E2E 锚点**：`whiteboard-island-surface` testid（`TASK-2402`）

### Changed

- **docs/05** §1.2.6c：E2E 覆盖矩阵（`TASK-2408`）
- **`verify:ci-e2e-nightly`**：登记 expand spec 与 runner（`TASK-2406`）

## [1.102.0] - 2026-08-01

### Added

- **思维导图文档**：每群多张独立导图（新建/打开/保存/重命名/删除）；`mindmap_documents` 表 + 群文件 JSON 持久化（`SPIKE-2301` · `TASK-2301`）
- **MindmapToolbar**：`mindmap.toolbar` Slot 接线；可选「从任务导入」；下载 JSON/PNG；发到群聊（`TASK-2302` · `TASK-2303` · `TASK-2304` · `TASK-2305`）
- **ViewExportShareActions**：白板/甘特/脑图统一导出·下载·分享入口（`TASK-2306` · `TASK-2307` · `TASK-2308`）
- **`verify:mindmap`**：静态门禁（schema · IPC · MindmapView/Toolbar）（`TASK-2309`）

### Changed

- **MindmapView**：默认空白文档，不再自动绑定 `task.list`（`TASK-2302`）
- **白板**：Excalidraw 顶栏补本地下载 PNG + 发到群聊（`TASK-2306`）
- **甘特**：工具栏补发到群聊（PNG）（`TASK-2307`）
- **浏览器 stub**：`browserLanpmStub` 补 `mindmap.*` API（`TASK-2301`）
- **docs/04** · **docs/07**：脑图文档模型与三视图导出矩阵（`TASK-2310`）

## [1.101.4] - 2026-08-01

### Fixed

- **视觉截图**：mindmap 协作抽屉 `waitForCollabDrawer` 改用 `data-mindmap-ready` 与 mind-elixir 4.x `me-tpc`/`me-root` 选择器（`TASK-2108`）
- **ESLint**：清零 `react-hooks/exhaustive-deps` 与 `react-refresh/only-export-components` 警告（`TASK-2109` · `TASK-2110`）
- **白板 CSP**：`predev`/`prebuild` 复制 Excalidraw prod 资源至 `public/excalidraw/`，CSP 增加 `font-src 'self' data:`，消除 esm.sh 字体 blocked 告警（`TASK-2111`）

## [1.101.3] - 2026-08-01

### Fixed

- **verify-debt（SPIKE-1310）**：`verify:checklist` · `message-task` · `group-tag-dict` · `sync-outbox` 去 SCHEMA_VERSION 硬编码，改 `EXPECTED_TABLES` / 下限断言
- **task-crdt 集成**：`taskCrdtModel.ts` ESM import（`./tags.ts` · `./linkedFiles.ts`）；`verify:task-crdt*` 三脚本恢复绿

### Added

- **`verify:verify-debt`**：聚合 7 脚本 · `verify:verify-debt-static` 静态门禁
- **docs/05** §1.2.6b

## [1.101.2] - 2026-08-01

### Added

- **ci-e2e-nightly**：底栏 **chat / board / tree** 挂载冒烟 E2E（`verify:e2e-views` · `views-tab-smoke.spec.ts`）；`BottomNav` `nav-tab-*` testid；`openDemoProjectView` fixture helper
- **GitHub `e2e-nightly` workflow**：ubuntu + `xvfb-run` · `verify:e2e-discover` + `verify:e2e-views`（可选 schedule / 手动触发；不进 PR 矩阵）
- **`verify:ci-e2e-nightly`**：静态门禁（脚本 · spec · workflow · docs 对齐）

### Changed

- **docs/05** §1.2.6a：SPIKE-1226 决策落地；标注非 `verify:release-gate`

## [1.101.1] - 2026-08-01

### Changed

- **日历**：推断排期提示条与样式（`calendar.inferredHint`）
- **聊天**：协作抽屉 · Emoji 选择器样式微调
- **Profile**：数据存储面板分区与备份说明 · `DataStoragePanel.module.css`
- **会议工具栏**：Popover Lite/Pro 状态与参会者列表 i18n
- **思维导图**：`mindElixirLoader` 开发态加载优化

### Removed

- **lanpm.formjs**：正式移除插件目录 · `FormJsView`/`FormJsPoc` · `verify:formjs-plugin`；`docs/07` · license 示例同步

### Fixed

- **发版门禁**：`README` / `README.zh-CN` 版本徽章与 `package.json` 对齐 · `verify:release-gate` 绿（TASK-1901～1910）

## [1.101.0] - 2026-08-01

### Added

- **Ops Phase 2 剩余（ops-p2-remaining）**：群级 **Ops 助手 Bot**（`deviceKind: bot` · `@Ops` L2 短答 ≤500 字 · `meta.source: ops-bot`）；**出站 watch**（`chokidar` · 30s/文件节流 · 默认关）；**任务挂包深化**（`/deploy` 与命令结果写入任务 description）；Profile `OpsAssistantPanel`；`verify:ops-p2-remaining`（TASK-1801～1810）

### Changed

- **`docs/07_插件与扩展.md`** §8.2 / §38 Phase 2 剩余 ✅ · **`docs/06_ROADMAP.md`** §5 行 4

## [1.100.1] - 2026-08-01

### Fixed

- **思维导图（开发态）**：`mindElixirLoader` 改用 Vite 可解析的 `import('mind-elixir')`；抽屉内嵌布局占满高度；`postinstall` 自动安装 `plugins/lanpm.mindmap` 可选依赖

### Changed

- **日历**：推断排期提示条（`calendar.inferredHint`）
- **数据存储**：Profile 面板分区标题与备份说明文案
- **会议工具栏**：Popover 详情区 Lite/Pro 状态与参会者列表 i18n

### Removed

- **lanpm.formjs（Advanced Form / form-js）**：移除可购表单 POC 插件及 `@bpmn-io/form-js` 子包、`FormJsView`/`FormJsPoc` 内置 UI、`verify:formjs-plugin`；任务详情默认不再出现干扰性扩展表单

## [1.100.0] - 2026-08-01

### Added

- **Ops Phase 3（ops-p3）**：主进程嵌入 Gateway HTTP（`127.0.0.1` · Bearer token · `pathGuard`）；Profile 启停与 token 轮换；Web 文件浏览 `/`；可选 Web Terminal `/terminal`（`node-pty` + xterm.js，默认关）；Gateway 审计日志（TASK-1701～1710）
- **门禁**：`verify:ops-p3`；`verify:ops-gateway-spike` 改查 `src/main/gateway/`

### Changed

- **`docs/07_插件与扩展.md`** §38 Phase 3 ✅ · **`docs/06_ROADMAP.md`** §5 行 5
- **`tools/lanpm-gateway`**：re-export 主进程 `httpServer` 实现


### Added

- **Extension API v0.6（extension-v06）**：`chat.sendMarkdown`（人审）· `ai.getThread`（读）· `ai.streamChat`（人审后返回 `requestId` 并走现有 `ai:streamChunk` 通道）；对齐 `lanpm.ai-assistant` manifest（TASK-1601～1608）
- **门禁**：`verify:extension-api-v0.6`；`verify:extension-api-v0.5` 人审列表断言改为子集检查

### Changed

- **`docs/07_插件与扩展.md`** §4.2 · §4.4 · §9：`v0.6` 路线与验收脚本

## [1.98.0] - 2026-08-01

### Added

- **meeting-media-v2（v1.98.0）**：聊天 **语音消息**（`voice` 类型 · PTT 按住说话 · 气泡播放）· **Lite mesh 真投屏**（选源 + `addTrack` + 对端预览）· **会议工具栏收纳**（单「会议」按钮 + Popover 菜单）（TASK-1502～1506）
- **门禁**：`verify:chat-voice` · `verify:meeting-media-v2`（TASK-1507 · TASK-1509）
- **Meeting Pro UX（meeting-pro）**：Popover 内 LiveKit 视频格与参会者列表；Pro 摄像头/投屏开关；日程 Join 在 LiveKit 已配置时走 Pro；录制保存对话框 i18n +「仅本机轨」说明（TASK-1402～1406）

### Fixed

- **底栏 Tab 撑满（TASK-1311）**：`group.tab.overflow` 无插件时不渲染空 `.tabSlot`，隐藏 files/whiteboard/mindmap 后剩余 Tab 等宽撑满（IA-409）

### Changed

- **聊天 Composer IA**：会议控件从语音模式主体迁至 **工具栏图标行**；`MeetingToolbar` 单按钮 Popover 收纳；语音模式 PTT 按住说话（TASK-1504 · TASK-1506）
- **会议静态守卫（TASK-1312）**：`verify:meeting-*` 对齐 `MeetingToolbar` / `PluginZoneHost` 接线
- **视图 Slot 守卫（TASK-1313）**：`verify:view-slot-hosts` chat `context` zone 落点改 `ChatView`；`verify:visual` 增补 IA-409
- **文档同步（TASK-1314 · TASK-1508）**：`docs/06` §3.4 · `docs/07` §12.4 会议 voice/Lite 投屏与实现一致

## [1.96.2] - 2026-08-01

### Added

- **视觉截图发版策略（TASK-1221）**：`verify:visual-screenshots` 不进 CI / `verify:release-gate`；打 tag 前本地必跑（`docs/05` §1.3.1 · Linux `xvfb-run`）；新增 `verify:release-screenshots-policy` 静态守卫
- **协作面板截图（TASK-1223）**：`visualCapture` 在聊天页打开协作抽屉截取 files / whiteboard / mindmap（`COLLAB_DRAWER_SLUGS` · IA-408）；`data-visual-collab` · `dataset.visualCollabDrawer` 供无头等待
- **截图基线同步（TASK-1224）**：`docs/screenshots/baselines` 更新为协作抽屉态（含 `light_mindmap` / `dark_mindmap`）；`assets/` README 门面图同步；`verify:screenshots-layout` / `verify:screenshots-sync` 守卫扩展
- **插件面视觉守卫（TASK-1225）**：`verify:plugin-ui-surfaces` — Profile `profile.tab` · `PluginsPanel` · 任务详情 `task.detail.section`（树/看板）· formjs `data-formjs-engine` / `formJsHost`；并入 `verify:release-gate`
- **核心视图 E2E 范围（SPIKE-1226）**：暂缓 chat/board Tab 冒烟与任务 CRUD E2E；决策记入 `docs/05` §1.2.6 补充
- **非聊天视图 perf 冒烟（TASK-1227）**：`verify:core-views-perf` — GroupView lazy 重视图 · board/tree/gantt memo · 白板防抖与协作抽屉延迟挂载；`docs/06` §4 引用
- **真机手验清单（DOC-1228）**：`docs/06` §4.1 发版前手勾表与 `docs/05` §8.1 对齐（含聊天协作抽屉 #3 · 视觉 PNG #2）
- **i18n 英文布局（TASK-1229）**：`verify:i18n-en` 扩展 cockpit/chat 内联标签长度 · 视图 i18n · CSS 折行/省略守卫

## [1.96.1] - 2026-08-01

### Fixed

- **聊天协作 IA follow-up（SPRINT-15）**：白板在抽屉内笔迹与指针错位（`embedded` + 动画结束后再挂载 Excalidraw）；聊天附件 / 任务附件点击文件无反应（改走 `openCollaborationPanel` + `pendingSelectFileId`）；任务「打开白板」改走协作抽屉并传递 `linkTaskId`
- **路由守卫**：`GroupViewGuard` / `PluginViewGuard` 不再因 `hiddenViews` / `hiddenContributedRoutes` 阻断深链与「全屏编辑」逃逸路由

### Added

- **`openCollaborationPanel.ts`**：统一从任意视图打开文件库 / 白板 / 脑图抽屉
- **`chatCollaborationStore`**：`pendingLinkTaskId`；`chatCollaborationStore` 单测
- **静态门禁**：`verify:visual` IA-405～407 · `verify:nav-preferences` / `verify:nav-per-group` 守卫语义更新

### Changed

- **onekey 开发启动**：`onekey_run.sh` / `onekey_run.bat` / `onekey_run.ps1` 启动后从 `dev.log` 解析实际 Vite URL（端口避让后可能非 5173），写入 `.lanpm/dev.url`；`status` 显示 LanPM 当前地址，其他占用端口标注「自动避让」；新增 `scripts/onekey-dev-url.mjs`（`wait` / `read` / `clear`）

## [1.96.0] - 2026-08-01

### Added

- **聊天协作 IA（SPRINT-15）**：文件库 / 白板 / 脑图从默认底栏 Tab 迁至 **聊天 Composer 工具栏** → `ChatCollaborationDrawer` 侧栏抽屉；保留 `#/g/:id/files|whiteboard|mindmap` 深链与抽屉内「全屏编辑」
- **`chatCollaborationStore`**：聊天与任务详情共用 `open(panel)` 打开协作面板
- **导航默认**：`navPreferences` 默认隐藏 `files` / `whiteboard` Tab 与贡献 `mindmap` Tab（老用户偏好仍保留）
- **静态门禁**：`verify:visual` IA-401～404 · `verify:nav-preferences` 默认 IA 断言

### Changed

- **`TaskDetailPanel`**：附件区「打开文件库」改为呼出聊天协作抽屉，不再跳转 files Tab
- **文档**：`docs/04` §2 导航 IA · `docs/07` §1.4/§3.4 · `plugins/lanpm.mindmap` README · mock 引导文案

## [1.95.2] - 2026-08-01

### Fixed

- **付费插件许可证 · 构建/打包闸（TASK-1220）**：移除 `licenseStore` 中 `!app.isPackaged` 隐式绕过；`npm run build` / `dist/*-unpacked` / 正式安装包均须正式离线授权，仅 `LANPM_LICENSE_SKIP_VERIFY=1` 等显式开发/测试开关可跳过；新增 `verify:pack-license` 并入 `prebuild` 与 `verify:release-gate`
- **覆盖率门禁**：补 `ops/validate` · `whiteboardCrdtModel` · `bounded` 单测，恢复 `verify:coverage` ≥85%
- **发现中继集成测试**：`verify:discover-relay` 避免多节点同 `groupId` 覆盖 `ownerUserId` 导致偶发失败

## [1.95.1] - 2026-08-01

### Fixed

- **付费插件开发闸**：`licenseDevBypass` — `npm run dev`（`LANPM_LICENSE_SKIP_VERIFY=1`）与 stub·E2E·截图测试可跳过许可证；**构建/未打包 dist/正式安装包**须正式授权（见 `[Unreleased]` 构建闸加固）
- **思维导图**：`ensure-plugin-deps` 自动安装 `plugins/lanpm.mindmap` 的 mind-elixir；修复开发期 `task.list` 被 license 拦截导致页面无法打开
- **视觉规范**：补 `--lanpm-fill-tertiary` token；`chat.module.css` 机器标签字号改用 `--lanpm-font-tab`（`verify:visual`）

## [1.95.0] - 2026-08-01

### Added

- **ops-p2 · 机器成员 UX（TASK-1210）**：成员列表/资料/提及 — `deviceKind: machine` 云服务器图标 · 「机器」标签 · 离线灰显 · 隐藏对机器的私聊入口；`memberService` 保留机器 presence 且人类排序优先；i18n `chat.memberMachine*`
- **ops-p2 · 斜杠命令扩展（TASK-1211）**：`/disk` `/ps` `/tail <path|key>` — `readOnlyCommands.ts` 路径白名单 · 单元测试 · composer 提示更新
- **ops-p2 · 命令审计（TASK-1213）**：`ops-command-audit.json` 记录 who/when/cmd/结果摘要 · `ops:listAudit` IPC · Profile `lanpm.ops` Tab 只读表格
- **ops-p2 · L3 分析入口（TASK-1214）**：日志/ops 文件与 `ops-agent` 文本消息 ·「在助手中分析」→ `AiAssistantShell` 注入脱敏 `seedMarkdown` · `shareToChat` 沿用现有顶栏助手
- **ops-p2 · `/help` 动态化（TASK-1215）**：本群机器在线列表 · composer 显示在线数 · `/help` 本地回群（无需 Agent）
- **ops-p2 · `/status` GPU（TASK-1212）**：Agent `nvidia-smi` 探测首卡利用率/显存 · 无 GPU 则省略该行
- **ops-p2 · 任务挂包（TASK-1216）**：群聊发文件时 composer 含 `#任务` 则自动写入 `Task.linkedFileIds` · 任务详情附件区可见 · 不改动 `/task` 斜杠
- **ops-p2 · Ops 设置 UI（TASK-1217）**：Profile `lanpm.ops` Tab — 许可/启停态 · Agent 配对说明 · 本群机器只读列表 · 命令审计
- **ops-p2 · 验收与文档（TASK-1218）**：`npm run verify:ops-p2` · `07` §38 · `06` §5 更新

## [1.94.2] - 2026-08-01

### Changed

- **`docs/07_插件与扩展.md`** — 合并原 `插件开发.md` · `插件离线分发.md` · `功能扩展.md` 为正式 **07** 编号 SSOT（上编 §1–12 · 中编 §13–26 · 下编 §27–42）
- **`docs/00_文档导航.md`** — 文档体系 **00–07**；插件分发与运维扩展决策链入 §4
- **全仓引用** — `01` · `03` · `06` · `plugins/README` · `tools/lanpm-*` · `verify:*` 静态守卫路径同步至 `07_插件与扩展.md`

## [1.94.1] - 2026-08-01

### Changed

- **ops-status-patch · `/status`**：`statusSnapshot.ts` — uptime · 内存绝对值（used/total）· Agent `root` 磁盘 `statfs`（不可用时 `disk: unavailable`）
- **`verify:ops-agent`** — 守卫 `statusSnapshot` 落点 · `formatStatus(paths.root)`
- **`docs/07_插件与扩展.md`** — `/status` 字段说明；GPU defer → Phase 2

## [1.94.0] - 2026-08-01

### Added

- **ops-mvp-p1 · Phase 1 Full MVP**：`lanpm agent start` / `tools/lanpm-agent/` headless Agent · 机器成员 `deviceKind: machine`
- **P2P 运维协议**：`ops_command` · `ops_command_result` · `ops_inbound`（`src/shared/ops/` · `src/shared/network/types.ts`）
- **L1 斜杠命令**：`/help` `/logs` `/status` `/deploy` — 聊天 composer 解析 + `@机器` 路由（`src/shared/chat/opsCommand.ts`）
- **入站/出站**：聊天文件 → Agent `inboundDir`；命令结果 → 群文本/文件消息
- **`plugins/lanpm.ops`**：manifest · `OpsStub` · capabilities `ops.machine.list` / `ops.command.send`（默认关 · `pricing: paid`）
- **`src/main/gateway/`**：自 SPIKE 抽取 `pathGuard` + `fileStore` 供 Agent 复用
- **Host capability / IPC**：`registerOpsIpc` · 机器上下线系统消息 · i18n `chat.ops*` / `plugin.ops*`
- **`verify:ops-agent`** — 静态守卫 + 单元测试（`opsCommand` · `pathGuard` · `commandExecutor`）

### Changed

- **`docs/03`** §6.5.8 — `ops_*` payload 草案 · `GroupMember.deviceKind`
- **`docs/06_ROADMAP.md`** §5 Phase 1 标已交付
- **`docs/07_插件与扩展.md`** · 上编 — Ops MVP 与 `lanpm.ops` 清单同步

## [1.93.2] - 2026-08-01

### Added

- **SPIKE-OPS-001 · `tools/lanpm-gateway/`**：最小 HTTP 网关（目录列表 + 单文件 upload/download）· localhost bind · path 白名单
- **`verify:ops-gateway-spike`** — 静态守卫 + `tools/lanpm-gateway` smoke 测试
- **`docs/07_插件与扩展.md`** 下编 — 运维协作讨论稿入库；SPIKE 状态已交付
- **`docs/06_ROADMAP.md`** §5 运维协作与远程网关

## [1.93.1] - 2026-08-01

### Changed

- **`docs/specs/`** · **`docs/decisions/`** → `.cursorGrowth/specs/` · `.cursorGrowth/decisions/`（本地，不进 Git）
- **`workflow.json`** `sdd.specs_dir` → `.cursorGrowth/specs`
- **`verify:*`** — 入库守卫只验代码；Growth 文档存在时可选本地校验
- **lint** — 移除未使用 import/变量（会议排期 · chat 虚拟列表 · PluginSlot）

## [1.93.0] - 2026-08-01

### Added

- **Worker 代码高亮（highlight-worker）**：`highlight.worker.ts` · `highlightCodeAsync` · `CodeBlock` async UI
- **`verify:highlight-worker`** — 静态守卫 + `tests/unit/chat/highlightSetup.test.ts`
- **`docs/decisions/chat-perf.md`** — chat-perf 主序列（v1.83–v1.93）决策摘要

### Changed

- **`highlightSetup` / `highlightCore`**：同步 `highlightCode` 保留；LRU/50k 上限迁入 `highlightCore`
- **`CodeBlock`**：`useEffect` + `AbortController` 异步高亮；加载态 `codeBlockHighlightLoading`
- **`06_ROADMAP.md`** — 聊天性能主序列标 ✅；指针改 `docs/decisions/chat-perf.md`
- **`verify:chat-perf*`** · **`verify:docs-optim-closeout`** — 守卫代码落点 + `docs/decisions/`；`docs/` 不再保留 `优化.md`
- **chat-perf 文档分层**：全文迁入本地 `.cursorGrowth/archive/chat-perf/`（不进 Git）；`docs/00_文档导航.md` · `README.md` 同步

## [1.92.1] - 2026-08-01

### Changed

- **SPIKE highlight-worker**：调研结论 **Defer** — `docs/specs/015-highlight-worker-spike/spike.md` · `verify:highlight-worker-spike`

## [1.92.0] - 2026-08-01

### Added

- **顶栏网络空闲门控（topbar-network-idle）**：`useNetworkIdlePoll` — Page Visibility 跳过 hidden tick · visible 补刷
- **`docs/specs/014-topbar-network-idle/spec.md`**
- **`verify:topbar-network-idle`** — 静态守卫 TopBar 无裸 8s interval

### Changed

- **`TopBar`**：网络状态轮询改 `useNetworkIdlePoll`（对齐 `MemberList` presence 模式）
- **`docs/优化.md`** §1 / §5 P3 顶栏轮询标 ✅ v1.92.0

## [1.91.0] - 2026-08-01

### Added

- **DM 会话预览 IPC（dm-preview-ipc）**：`CHAT_IPC.listDmPreviews` · `dmPreviewStore` · `useDmPreviews` 增量 patch
- **`docs/specs/013-dm-preview-ipc/spec.md`**
- **`verify:dm-preview-ipc`** — 静态守卫 IPC 与 `DmSessionRow` 无 `messagesByGroup` 订阅

### Changed

- **`DmSessionBar`**：预览改读 `dmPreviewStore`，不再按行订阅 `messagesByGroup`
- **`messageRepository.listDmMessagePreviews`** — SQLite 窗口函数按 DM 群取末条消息
- **`docs/优化.md`** §5.15 Store 写入减负标 ✅ v1.91.0

## [1.90.0] - 2026-08-01

### Added

- **聊天性能 store-hooks（chat-perf-store-hooks）**：`chatStoreActions` · `ChatView` 动作订阅改 `getState()` · 邻域组件收敛
- **`docs/specs/012-chat-perf-store-hooks/spec.md`**
- **`verify:chat-perf-store-hooks`** — 静态守卫禁止动作 selector

### Changed

- **`ChatView`**：`useChatStore` 仅保留按 `gid` 的数据切片；`groupType` 经 `navGroups` 派生
- **`DmSessionBar`** · **`MemberList`**：DM/成员动作经 `chatStoreActions`
- **`docs/优化.md`** §5.19 Zustand 选型标 ✅ v1.90.0

## [1.89.0] - 2026-08-01

### Added

- **会议体验产品化（meeting-productization）**：主进程提醒 i18n · `userData/locale.json` 同步 · 通知点击深链到群 · 日程「加入会议」CTA · 面板时长/时间 i18n
- **`docs/specs/011-meeting-productization/spec.md`**
- **`verify:meeting-productization`** — 静态守卫 locale · 深链 · join CTA

### Changed

- **`meetingReminderService`**：使用 `meetingReminderCopy` + `readAppLocale`，通知携带 `groupId`
- **`MeetingSchedulePanel`**：时长 Select i18n · 列表 join 按钮 · `formatScheduleWhen` 尊重 locale
- **`docs/插件开发.md`** §8.3 会议产品化标 ✅ v1.89.0

## [1.88.0] - 2026-08-01

### Added

- **优化文档 closeout（docs-optim-closeout）**：`docs/优化.md` §1 状态列 · §2 历史横幅 · §5 开放项对齐
- **`docs/specs/010-docs-optim-closeout/spec.md`**
- **`verify:docs-optim-closeout`** — 静态守卫页眉 · ROADMAP · 开放债关键词

### Changed

- **`docs/06_ROADMAP.md`**：聊天性能主序列标 **v1.83–v1.87 已交付**；剩余债单行
- **`docs/00_文档导航.md`**：`优化.md` 描述为 backlog SSOT

## [1.87.0] - 2026-08-01

### Added

- **聊天性能观测（chat-perf-observe）**：性能预算表 · packaged 抽检 playbook · 人工回归模板
- **`docs/specs/009-chat-perf-observe/spec.md`** — §Budget · §10.4 步骤 · 通过标准
- **`docs/templates/chat-perf-regression.md`** — 发版前走查勾选表
- **`docs/chat-perf-baseline.md`** — v1.86 参考基线 + 历史记录表
- **`verify:chat-perf-observe`** — 静态守卫 spec · 模板 · 脚本入口

### Changed

- **`docs/优化.md`**：§5.7 预算链到 spec · §9 现状列对齐 v1.83–v1.86 · §10.4 观测链完整 · §11 补 v1.87.0

## [1.86.0] - 2026-08-01

### Added

- **聊天性能 viewport（chat-perf-viewport）**：严格视口 `deferHeavyContent` — 离屏不进 `MarkdownView` / `highlightCode`
- **`MessageContentDeferProvider`** · `shouldDeferHeavyContentForRow`（虚拟行 + scroll 判定）
- **`isImageFileName`** · Markdown `<img loading="lazy">` · `UserAvatar` `deferImage`
- **`verify:chat-perf-viewport`** · Spec `docs/specs/008-chat-perf-viewport/spec.md`

### Changed

- **`ChatVirtualMessageList`**：消息行包裹 defer Provider（overscan DOM 保留、重内容 defer）
- **`ChatMessageText`** / **`CodeBlock`** / **`MarkdownView`**：defer 态纯文本 / 行数占位
- **`docs/优化.md` §11**：补 v1.85.0 · §5.12 / §5.18 标 ✅ v1.86.0

## [1.85.0] - 2026-08-01

### Added

- **聊天性能 P3（chat-perf-p3）**：`listMenus(location?)` IPC 按锚点过滤 · `pluginMenusCache` 按 location 缓存
- **`ChatMessageActionsContext`**：Router 导航/任务定位上提，气泡无 `useNavigate`/`useParams`/`useLocateTask`
- **高亮 LRU** · **Markdown `msgId+textHash` 缓存** · **`BoundedSet`/`LruMap`** 工具
- **`verify:chat-perf-p3`** · Spec `docs/specs/007-chat-perf-p3/spec.md`

### Changed

- **`MessageBubble`**：`memberById` + 含 `@`/`#` 才传 mention/task 子集；`replyQuotesByMsgId` 预计算
- **`highlightSetup`**：禁 `highlightAuto` → `plaintext`；50k 字符上限；≈200 条 LRU
- **`useChatNotifications`**：`notifiedIds` 上限 10k；**`useNewMessageScroll`** 滚动记忆最多 20 群
- **`docs/优化.md` §6**：序 10 标 **✅ v1.85.0**

## [1.84.0] - 2026-08-01

### Added

- **聊天性能 follow-up（chat-perf-follow）**：`messageListMerge` 增量合并 + 每群 **2000** 条内存窗口
- **`downgradeInactiveGroups`**：切群后非活跃群仅保留 lastMessage（DM 预览）
- **`verify:chat-perf-follow`** · Spec `docs/specs/006-chat-perf-follow/spec.md`

### Changed

- **`MemberList`**：侧栏不可见时停止 presence 轮询；间隔 12s + `visibilityState` 门控
- **`useMarkRead`**：依赖 `otherMsgIdsKey`，己方 delivery 更新不再触发全表扫描
- **`chatStore`**：`upsertMessage` 追加 O(1) · patch 原位；`mergeOlder` 走共享模块
- **`DmSessionBar`**：`DmSessionRow` 按会话 selector；仅加载当前 DM 历史
- **`CodeBlock`**：折叠长代码延后 `highlightCode`；**`ChatMessageText`** `memo`
- **`docs/优化.md` §6**：序 5–7、9–12 标 **✅ v1.84.0**

## [1.83.0] - 2026-08-01

### Added

- **聊天性能 Sprint（chat-perf）**：会话级 `ChatPluginMenusProvider` + `pluginMenusCache` / `pluginSlotCache`（插件 IPC 与消息条数 N 解耦）
- **虚拟消息列表**：`ChatVirtualMessageList`（`@tanstack/react-virtual`）· 按日分组行模型 `chatVirtualRows`
- **单例右键菜单**：`ChatView` 级 ContextMenu + 按需 `PluginZoneHost`（`chat.message.action`）
- **`verify:chat-perf`** · Spec `docs/specs/005-chat-perf/spec.md`

### Changed

- **`MessageBubble`**：`memo` + `useChatPluginMenuItems`；移除 per-bubble `PluginZoneHost` / `Dropdown` contextMenu
- **`ChatView`**：`selectedMsgIds` → `Set`；`PinnedMessagesBar` 接收 `messageById` Map
- **`docs/优化.md` §6**：序 1–4、8 标 **✅ v1.83.0**

## [1.82.0] - 2026-08-01

### Added

- **Extension API v0.5**：`chat.sendText` · `file.upload` 经 Host 人审（`pending_confirm` + `confirmCapability`）
- **`chat.sendText`** 白名单：`groupId` · `text` · `replyToMsgId?`
- **`file.upload`** 白名单：`groupId` · `sourcePath`（存在 · 为文件 · 200MiB 上限）
- **`lanpm.example` v0.5.0**：Composer 演示发送文本 + 上传文件
- **`verify:extension-api-v0.5`** · Spec `docs/specs/004-extension-api-v0.5/spec.md`

### Changed

- **`docs/插件开发.md` §4**：v0.5 路线 · `chat.sendText` / `file.upload` 交付态

## [1.81.0] - 2026-07-31

### Added

- **会议本地录制 MVP**：入会后可 `MediaRecorder` 录制，`meeting.saveRecording` 经 `showSaveDialog` 保存本机 `.webm`
- **群级会议日程 MVP**：`meetingSchedule` 本机 JSON 持久化 · `MeetingSchedulePanel` 预约/列表/删除
- **桌面提醒**：开始前 5 分钟 + 开始时（主进程 `meetingReminderService`；浏览器桩 renderer 轮询）
- **`verify:meeting-recording`** · **`verify:meeting-schedule`** · 单测 `meetingReminderLogic`
- **Spec**：`docs/specs/003-meeting-ux-next/spec.md`

### Changed

- **`MeetingToolbar`**：录制钮/计时 · 日程 Popover · 详情内日程区
- **`docs/插件开发.md` §12.4**：录制+日程 MVP 交付态
- **消息气泡右键菜单**：去掉置顶/隐藏/挂文件到任务；**回复→引用**；@此人仅保留头像菜单（避免重复）

## [1.80.0] - 2026-07-31

### Added

- **Extension API v0.4 写操作人审**：`task.create` / `task.patch` / `board.moveTask` 经 `invokeCapability` 返回 `pending_confirm`，须 `confirmCapability` 才落库
- **`task.create`**：白名单字段 `groupId` · `title` · `status?` · `priority?` · `tags?`
- **Renderer**：`invokeCapabilityWithHumanConfirm`（Modal 确认）· `lanpm.example` 演示提议→确认
- **`verify:extension-api-v0.4`** · 单测 `capabilityConfirm` / `taskCreateWhitelist`

### Changed

- **文档**：`docs/插件开发.md` §4 — Extension **v0.4 = 写人审**；license/侧载不再占用「v0.4」标签

## [1.79.1] - 2026-07-31

### Fixed

- **消息引用预览 i18n**：空内容不再回落英文 `message.type`（`file`/`code` 等），改用 `chat.previewKind*`；通知撤回预览走 `chat.recalledPreview`

## [1.79.0] - 2026-07-31

### Added

- **聊天消息进阶交互**：引用回复（引用条 + 气泡展示 + 跳转高亮）· 转发 · 群置顶（`chat_pin` 同步）· 多选批量（复制/转发/本机隐藏）· 己方文本 15 分钟内编辑（`chat_edit`）
- **共享模块**：`replyQuote` · `forwardMessage` · `messageEdit` · `pin` · `hiddenMessages`
- **`verify:message-context-v2`** · 单测覆盖 reply/forward/pin/edit

### Changed

- **气泡右键菜单 v2**：扁平增 reply/forward/pin/edit/hide/多选；撤回仍置底
- **`docs/01` §6.3** · **`docs/04`** · 同步协议 `chat_edit` / `chat_pin`

## [1.78.9] - 2026-07-31

### Added

- **消息气泡右键菜单**：复制（文本/代码/文件/task_ref）· 代码「复制代码」· 打开任务/文件 · 关联已有任务 · 对方 @此人
- **`messageContextMenu` 共享 builder** · `verify:message-context-menu`

### Changed

- **己方撤回** 移至菜单最底；插件项取消 divider，与核心项扁平排列
- **`docs/01` §6.3** · **`docs/04`** 聊天交互说明

## [1.78.8] - 2026-07-31

### Added

- **Manifest `menus[]` POC**：`PluginMenu` · `ListedMenuItem` · `resolveMenuCommandId`
- **锚点**：`topbar.user` · `chat.message.context`（点击复用 `invokeCommand`）
- **IPC**：`plugin:listMenus` · `usePluginMenus` hook
- **`verify:plugin-menus`** · `lanpm.example` 演示菜单项

### Changed

- **`plugins/lanpm.example` v0.3.1**：声明 `menus[]` 挂接 `hello` 命令
- **`docs/插件开发.md`**：§5 `menus[]` ✅

## [1.78.7] - 2026-07-31

### Added

- **每群导航覆盖（Layer A）**：`NavPreferencesDocument`（`global` + `byGroup`）· `resolveNavPreferencesForGroup`
- **IPC**：`getDocument` · `getGroupPreferences` · `setGroupPreferences` · `clearGroupOverride`
- **Profile UI**：「导航与视图」全局 / 当前群 Segmented ·「恢复跟随全局」
- **`verify:nav-per-group`** · 迁移/resolve 单元测试

### Changed

- **`nav-preferences.json`**：旧扁平 JSON 自动迁移为文档格式
- **Renderer store**：随 `activeGroupId` 解析有效偏好；BottomNav / 路由守卫使用本群有效 prefs
- **`docs/插件开发.md`**：§2.2 / §3.7 / §12 每群覆盖 ✅

## [1.78.6] - 2026-07-31

### Added

- **Extension API v0.3**：`task.patch`（字段白名单）· `board.moveTask`
- **`taskPatchWhitelist`** SSOT · `verify:extension-api-v0.3` · 单元测试
- **SDD**：`docs/specs/001-extension-api-v0.3/`

### Changed

- **`capabilityProxy`**：写能力经 `updateGroupTask` / `moveGroupTask`；`groupId` 校验
- **`lanpm.example` v0.3.0**：声明 v0.3 capabilities · composer demo「+5% 进度」
- **`docs/插件开发.md`**：§4.1 / §4.4 / §8.3 / §12 对齐 v1.78.6

## [1.78.5] - 2026-07-31

### Added

- **`ViewPluginContext.zone`**：`PluginZoneHost` 向插件注入当前 zone
- **`verify:view-slot-hosts` 加固**：禁聊天 toolbar 双挂载 · zone 感知守卫 · 岛面横排布局

### Changed

- **`ExampleStub`**：仅在 `zone=composer` 渲染 composer 动作
- **`MeetingToolbar`**：仅在 `zone=toolbar` 渲染
- **`ChatView` / `ChatVoiceMediaPanel`**：文本/语音各一处 `toolbar` zone（去重 `PluginGroupSlot`）
- **`chat.module.css`**：修复 `IslandPanel` 岛面侧栏与主区纵向错位
- **`docs/插件开发.md`**：§3.5 zone 契约 · §8.3 / §12.3 对齐 v1.78.5

## [1.78.4] - 2026-07-31

### Added

- **`MeetingToolbar`**：聊天区紧凑会议工具条（图标行 + Popover 详情）
- **许可闸**：`isPluginLicenseActive` · paid 未授权禁 join + 导入许可 CTA
- **Profile 深链**：`openProfileTab` · 未启用/未配置一键跳转扩展/会议旁路
- **`verify:meeting-ux`**：工具条 · 许可闸 · 深链静态守卫

### Changed

- **`MeetingStub`**：收敛为 `MeetingToolbar` 宿主
- **`ChatVoiceMediaPanel`**：未启用时展示「打开扩展管理」CTA
- **`docs/插件开发.md`**：§8.3/§12 会议体验产品化 ✅ v1.78.4

## [1.78.3] - 2026-07-31

### Added

- **命令 invoke 真执行**：`CommandAction` · main `invokeListedCommand` 返回结构化 action
- **`commandEffects`**：`applyCommandAction` 统一消费 core / plugin 副作用
- **`commandHandlerRegistry`**：renderer builtin handler 表 · `lanpm.example:hello` 可见反馈
- **`resolveCommandAction`**（shared SSOT）· `verify:command-palette` 禁 stub 文案

### Changed

- **`CommandPalette`**：单一 invoke 路径（移除 core 硬编码分支）
- **`docs/插件开发.md`**：§commands / §8.3 / §12 对齐 v1.78.3

## [1.78.2] - 2026-07-31

### Added

- **全局 Slot 接线**：`topbar.menu`（TopBar）· `group.tab.overflow`（BottomNav More）· `profile.tab`（Profile 动态 Tab）
- **`PluginGlobalSlot`** · `globalSlotMap` SSOT · `verify:view-slot-hosts` 全局锚点守卫
- **`lanpm.example`**：声明 `profile.tab` 样例 Tab

## [1.78.1] - 2026-07-31

### Changed

- **`docs/插件开发.md`**：§1–§12 与 v1.75–1.78 代码/CHANGELOG 真源对齐（许可证闸 · Layer A · 命令面板 · Slot 接线 · 里程碑表）
- **`docs/06_ROADMAP.md`**：插件/会议/许可证「已交付」指针纠偏，移除 `paid` 仅为展示等过时表述

## [1.78.0] - 2026-07-31

### Added

- **命令面板 POC**：Ctrl/Cmd+K · 过滤列表 · Enter 调用 Host invoke stub
- **Manifest `commands[]`**：`PluginCommand` · `parseCommands` · 空 slots 允许仅声明命令
- **IPC**：`plugin:listCommands` · `plugin:invokeCommand`（core + 已启用插件）
- **核心命令**：打开个人设置 / 导航偏好 / 扩展管理
- **样例**：`lanpm.example` → `hello`；`verify:command-palette`

### Fixed

- **README / README.zh-CN**：版本徽章与 Current 对齐 **1.78.0**（`verify:project` 门禁）
- **覆盖率**：补 `validateManifest` contributions/commands · notificationPreferences · discoverCoachmark · joinRequest 单测（≥85%）
- **视觉令牌**：`CommandPalette.module.css` 改用已定义 `--lanpm-*`（无 rgba/#hex fallback）
- **knip**：渐进规则（exports/types 等 warn）· `ignoreExportsUsedInFile`，避免历史债阻塞 `verify:m7`

## [1.77.0] - 2026-07-31

### Added

- **插件 Tab 导航偏好**：`hiddenContributedRoutes` · `contributedOrder`（核心 Tab 之后段内排序/隐藏）
- **Profile「导航与视图」**：列出已发现贡献视图，可拖拽与开关
- **BottomNav / PluginViewGuard**：尊重插件 Tab 显隐；隐藏 deep-link 重定向

## [1.76.0] - 2026-07-31

### Added

- **签名离线许可证**：`SignedPluginLicense` · 机器绑定 · Ed25519 验签
- **授权策略**：整插件 · **试用 90 天** · **永久**（`term: trial | perpetual`）
- **CLI**：`tools/lanpm-license/` — `collect` · `issue` · `verify`（C++/CMake/OpenSSL）
- **验收**：`verify:offline-license-cli` · `docs/插件开发.md` §8.2.2

## [1.75.0] - 2026-07-31

### Added

- **插件侧载 POC**：`userData/sideload-plugins/` · `signature.json` Ed25519 验签（`LANPM_PLUGIN_SKIP_VERIFY=1` 可跳过）
- **离线许可证**：`plugin-licenses.json` · `license.feature` capability · paid 插件能力闸
- **Profile 扩展**：导入许可证 · 许可/侧载状态展示
- **IPC**：`plugin:importLicense` · `plugin:getLicenseStatus`
- **验收**：`verify:plugin-market-spike`

## [1.74.0] - 2026-07-31

### Added

- **Layer C 宿主**：`contributions.views[]` manifest 校验 · 路由黑名单 · `listContributedViews` IPC
- **动态路由**：`/g/:groupId/:contributedRoute` · `PluginViewGuard` · `PluginContributedView`
- **底栏合并**：`BottomNav` 在核心 `VIEW_TABS` 后追加已启用插件 Tab
- **思维导图插件**：`plugins/lanpm.mindmap` · `MindmapView` / `MindmapStub` · `mindElixirLoader` 动态加载
- **Slot**：`mindmap.toolbar` · `CONTRIBUTED_VIEW_SLOT_MAP`
- **验收**：`verify:contributions-views`

## [1.73.0] - 2026-07-31

### Added

- **form-js 真库**：`plugins/lanpm.formjs/package.json` · `formJsClientLoader` 动态加载
- **FormJsView**：`@bpmn-io/form-js` 渲染；未安装子包时降级 `FormJsPoc` + 安装提示
- **Schema SSOT**：`plugins/lanpm.formjs/demo-schema.json` · `labelKey` i18n 解析
- **验收**：`verify:formjs-plugin`

## [1.72.0] - 2026-07-31

### Added

- **Extension API v0.2**：`chat.listMessages` · `task.getChecklist` · `member.list`（读）· `chat.sendTaskRef`（受控写）
- **capabilityTypes**：v0.2 参数/返回类型共享定义
- **lanpm.example**：`chat.composer.action` demo（探测读能力 · 发送任务引用）
- **验收**：`verify:extension-api-v0.2`

## [1.71.0] - 2026-07-31

### Added

- **Pro LiveKit 旁路**：`plugins/lanpm.meeting/deploy` docker-compose · `meeting-livekit.json` 配置
- **Host 代发 token**：`media.livekit.createToken` capability（JWT 仅 Main）
- **MeetingStub Pro**：LiveKit SFU join/leave/mute POC；`livekit-client` 为插件子包可选依赖
- **Profile「会议旁路」**：LiveKit URL / API Key / Secret 设置
- **验收**：`verify:meeting-livekit-pro`

## [1.70.0] - 2026-07-31

### Added

- **多视图 Slot 接线**：按 `viewSlotMap` 接齐 chat composer/context · board card · gantt/calendar context · files preview
- **TaskEditModal**：`task.detail.section` 与任务树详情对齐
- **验收**：`verify:view-slot-hosts` 扩展为遍历全 zone

## [1.69.0] - 2026-07-31

### Added

- **导航偏好 MVP（Layer A）**：`NavPreferences` · `userData/nav-preferences.json` · IPC `nav.get/setPreferences`
- **BottomNav**：按用户 `order` / `hiddenViews` 与 `tabRules` 交集渲染
- **深链守卫**：隐藏 Tab URL 回落默认可见视图 + Toast
- **Profile「导航与视图」**：拖拽排序 + Switch 显隐
- **验收**：`verify:nav-preferences`

## [1.68.0] - 2026-07-31

### Added

- **Lite mesh POC**：`media_signal` Sync 信令 · `mediaSignalService` 房间注册（≤4 人/群）· `desktopCapturer` Host 投屏代理
- **MeetingStub mesh**：加入/离开房间 · 参与者列表 · 原生 `RTCPeerConnection` 1v1 信令交换 POC
- **验收**：`verify:meeting-mesh-poc` · `verify:media-signal`

### Changed

- **媒体 capability**：`capabilityProxy` 接线真实 `media.*` 服务（移除 stub 返回值）

## [1.67.0] - 2026-07-31

### Added

- **会议插件 stub**：`plugins/lanpm.meeting` · `MeetingStub` · 媒体 capability（`media.signal.*` · `media.captureDesktop` · `media.room.state`）Host stub 代理
- **聊天语音面板**：`ChatVoiceMediaPanel` 接 `chat.toolbar.media`；未启用时展示扩展 CTA（替代 `voiceComingSoon`）
- **验收**：`verify:meeting-plugin`

### Changed

- **`verify:meeting-spike`**：断言更新为 meeting-host 基线（无核心媒体 SDK）

## [1.66.0] - 2026-07-31

### Added

- **ViewHost M1.5**：`ViewPluginContext` · `ViewPluginZone` · `PluginSlotHost` / `PluginGroupSlot` / `PluginTaskSlot` · `PluginZoneHost`
- **viewSlotMap**：7 个 `AppView` → zone → `PluginSlotId[]` SSOT（`docs/插件开发.md` §3.5.3）
- **插件槽扩展**：`chat.*` · `board.*` · `tree.toolbar` · `gantt.*` · `calendar.*` · `whiteboard.toolbar` · `files.toolbar` 入 `PLUGIN_SLOT_IDS`
- **7 核心 Tab**：各视图预留 `toolbar` zone 空锚点（`data-plugin-zone`）
- **验收**：`verify:view-slot-hosts`

### Changed

- **PluginSlot**：演进为 context 驱动；`taskId` 群级可选；`TaskDetailPanel` 保持兼容

## [1.65.6] - 2026-07-31

### Changed

- **开发桩 i18n**：`browserLanpmStub` 展示文案迁入 `stub.preview.*`（设备/用户/协作组/邀请/部门/示例任务）
- **bootstrap**：`#root` 缺失错误改英文（i18n 未加载路径）
- **i18n**：`types.ts` locale 键缩进统一

## [1.65.5] - 2026-07-31

### Changed

- **壳层控件高 SSOT**：新增 `--lanpm-control-height-shell`（32px）；`TopBar` · `GlobalSearch` · `RegionButton` 迁令牌
- **GlobalSearch**：`optionMeta` 改 `--lanpm-font-caption`（替代 `11px` 字面量）
- **文档**：`docs/04` §1.4/§1.5 补壳层高度令牌说明
- **验收**：`verify:visual` 守卫对齐 shell height token

## [1.65.4] - 2026-07-31

### Changed

- **审查报告归档**：根目录 `审查.md` → `archive/20260731_105300_审查_全仓审查报告_已交付归档.md`（P0/P1/P2 已在 v1.57～v1.65 交付；遗留仅可选 polish）

## [1.65.3] - 2026-07-31

### Changed

- **MIT开源替代**：`MIT开源替代.md` 全文融入 `docs/01`–`06`；归档 `archive/20260731_103000_MIT开源替代_并入01-06正文.md`
- **MIT开源替代**：`01` §14（产品原则）· `02` §16（决策树 · 矩阵 · LibreOffice）· `06` §5.1（替换债务队列）· `3rd/README.md`
- **文档**：修复 `01` §14 重复节；`00` 阅读顺序改指 `02` §16

## [1.65.2] - 2026-07-31

### Changed

- **飞鸽飞秋**：`飞鸽飞秋.md` 全文融入 `docs/01`–`06`；归档 `archive/20260731_102000_飞鸽飞秋_并入01-06正文.md`
- **飞鸽飞秋**：`01` §13（品类定位 · 信创）· `06` §6（吸收 A1–A6 · 免费/收费 · verify 锚点）· `插件开发.md` 链更新；开源实现态见 `02` §16
- **验收脚本**：`verify-a1-nudge` · `verify-project-files` · `verify-transfer-a4` · `verify-discover-a5` · `verify-platform-matrix` · `verify-plugin-spike` · `verify-plugin-loader` · `verify-meeting-spike` · `verify-whiteboard-realtime` 改读 `06_ROADMAP` §6
- **验收脚本**：`verify:whiteboard-realtime` 对齐 `SCHEMA_VERSION=16`

## [1.65.1] - 2026-07-31

### Changed

- **文档 SSOT 收敛**：`配对码.md` · `AI接入.md` 全文融入 `docs/01`–`06`；原文件归档至 `archive/20260731_*`；`00` 导航与追溯矩阵同步
- **配对码**：`01` §11.4 · `02` §13.6–§13.7 · `03` §6.5 · `04` §4.1 · `05` §1.2（手动节点入口与代码对齐）
- **AI 接入**：`01` §12.3–§12.4 · `02` §15 · `03` §3.6–§3.7 · `04` §4.2 · `05` §1.2.7（按 v1.33–1.41 实现态重写，修正原稿「未实现」滞后）
- **ROADMAP**：L3a/L3b 标为已交付；高级 Agent 编排后置 P1
- **验收脚本**：`verify-discover-help` · `verify-setup-net` · `verify-pairing-subnet-scan` · `verify-ai-*` 改读正文 SSOT
- **`插件开发.md`**：AI Capability 链至 `02` §15.3

## [1.62.1] - 2026-07-31

### Changed

- **`docs/插件开发.md`**：§3.5 Tab 视图宿主与 Zone 模型 · §3.6 Layer C `contributions.views` · §2.2 三层定制 · §12 ViewHost 标准化 Sprint 前置

## [1.65.0] - 2026-07-31

### Added

- **`--lanpm-text-disabled`**：亮暗禁用前景色 SSOT
- **`verify:visual` CO-401～403**：语义 disabled/dimmed 禁止整元素 opacity 守卫

### Changed

- **共享禁用**：`regionDisabled` · `ViewSegment` · `BottomNav.tabDisabled` 改令牌色
- **看板**：`cardRelationDimmed` / 图例弱化改 `color-mix` + `--lanpm-text-disabled`
- **树/日历/AI/聊天**：`discussionKind` · 推断日程 · disabled 控件 · `loadOlder` 去 opacity 叠加
- **`docs/04`**：disabled 约定改 `--lanpm-text-disabled`
- **`审查.md`**：§3.3 对账

## [1.64.0] - 2026-07-31

### Added

- **`RegionButton`**：`loading` prop · `emphasis` variant（主 CTA 实色 · 32px）
- **`verify:visual` CB-401～403**：驾驶舱无 Ant `Button` · RegionButton 能力守卫

### Changed

- **`CockpitView`**：16 处 Ant `Button` → `RegionButton`（header / 岛面板 / link 动作）
- **`AiConfigModal`**：探测连接按钮 → `RegionButton`
- **`审查.md`**：P2-9b ✅

## [1.63.0] - 2026-07-31

### Added

- **`LANPM_SURFACE_SOLID_HEX`**：白板空场景种子与 `--lanpm-surface-solid` 对齐
- **`verify:visual` AP-401～403**：审查清尾守卫（overlay 令牌、白板阴影、TaskDetailPanel 字号、knip 进 m7）

### Changed

- **`verify:m7`**：串联 `npm run knip` 死代码扫描
- **DiscoverCoachmark**：Tour 遮罩改 `readCssVar('--lanpm-overlay')`
- **白板**：Excalidraw 浮钮阴影改 `--lanpm-shadow-island`
- **TaskDetailPanel**：标签/清单 meta 字号改 CSS 令牌类
- **`审查.md`**：§5/§7 与 v1.57～1.62 交付对账

## [1.62.0] - 2026-07-31

### Changed

- **`docs/插件开发.md` 全面扩充**：§1.4 人·事主轴 · §2.2 双层定制（导航偏好 + 插件 Slot）· §3.2 按视图扩展地图 · §3.5 Tab 启停/排序 · §4.4 Extension API 路线 · §8 成熟度/市场 · §12 含导航偏好 MVP Sprint

### Added

- **`docs/插件开发.md`**：插件架构 SSOT — Slot/Capability 契约、`plugin.json` 规范、builtin registry 开发流程、用户消费路径、安全红线、生态阶段规划；`docs/00` 索引补链

## [1.61.0] - 2026-07-31

### Added

- **`verify:visual` IS-401～404**：Gantt / Files / Chat `IslandPanel hideHeader` 守卫

### Changed

- **甘特图**：`chartWrap` 收敛至 `IslandPanel hideHeader`；`chartRef` 挂至内层 `chartInner`
- **文件**：列表+预览 `.body` 网格收敛至 `IslandPanel hideHeader`
- **聊天**：桌面工作区 `chatWorkspaceDesktop` 改 `IslandPanel hideHeader`（`ChatWorkspaceFrame`）；窄屏不变
- **`docs/04` §1.3.1**：无标题岛面扩展至甘特 / 文件 / 聊天

## [1.60.0] - 2026-07-31

### Added

- **`IslandPanel.hideHeader`**：无标题岛面模式（`aria-label` + `panelBodyFlush`）；日历、任务树宿主收敛
- **`verify:visual` UC-401～404**：Board 四列 IslandPanel、Calendar/Tree surface、legacy columnHeader 清理

### Changed

- **看板**：todo/doing/done/other 四列统一 `IslandPanel`（移除 todo 试点分支）；`data-testid="board-column-island"`
- **日历 / 任务树**：`calendarHost` / `treeWrap` 改 `IslandPanel hideHeader`；重复岛面 CSS 从 module 移除
- **`docs/04` §1.3.1**：IslandPanel 三种模式约定

## [1.59.0] - 2026-07-31

### Added

- **设计令牌 · 间距体系（SPRINT design-tokens · TASK-588～595）**：`global.css` 新增 `--lanpm-space-1`～`--lanpm-space-6` 及语义别名；`docs/04` §1.2 间距表
- **`ui/IslandPanel`**：从驾驶舱内联手风琴 Panel 抽出；Board「待办」列试点

### Changed

- **Cockpit / Board / Calendar**：岛式面板 padding/gap 改用语义 spacing 令牌
- **Setup**：圆角字面量收敛至 `--lanpm-radius-*`
- **`verify:visual`**：SP-401～405 间距与 IslandPanel 守卫；CK-412 断言迁至 `IslandPanel`

## [1.58.0] - 2026-07-31

### Changed

- **驾驶舱交付走查（SPRINT cockpit-delivery · TASK-583～587）**：AI 巡检与流水线 Panel 默认折叠，矮视口更易滚至「报表输出」；手风琴 chevron 字号改用语义令牌；报表 Panel 增加 `data-testid`；`verify:visual` 补强 cockpit-delivery 守卫

## [1.57.0] - 2026-07-31

### Changed

- **质量审查修复（SPRINT quality-audit · TASK-571～582）**：首屏主题与 `uiStore` 共用 `readInitialTheme`（消除 FOUC）；亮色 `--lanpm-text-tertiary` 加深至 WCAG AA；移除 `MentionText` / `RegionTabBar` 死代码；AI 提供商预设与边缘 UI 全面 i18n；白板暗色背景随主题；消灭幻影 CSS 变量；聊天/看板 opacity 叠加可读性修复；`ViewHeader` 字号令牌化；扩展 `verify:visual`；引入 `knip` 死代码扫描

### Fixed

- **对比度**：`.dueOverdue` 改用语义色 `--lanpm-danger`；发送钮禁用态、mention 状态、图例分隔符去除低对比 opacity 叠加
- **类型**：`DiscoverCoachmark` Tour `target` 回退 `document.body`（`tsc` 绿）

## [1.56.0] - 2026-07-30

### Added

- **发现 P1 余量（SPRINT-UX-DISCOVER-PATH-02）**：分享态「复制配对信息」（码+IP+群名）；Setup 跳过网络页 / 零群组首启 **Discover Coachmark**（antd Tour → `topbar-discover`）；`formatPairingShareClipboard` · `verify:discover` · `verify:e2e-discover` ✅

## [1.55.0] - 2026-07-30

### Changed

- **发现入群路径减负（SPRINT-UX-DISCOVER-PATH-01）**：Segmented 分享方/加入方 + 三种码说明；配对成功后单可加入群自动入群/申请；零群组首启自动打开发现；驾驶舱空群 CTA；顶栏网络下拉去掉「添加节点」，发现内统一「连接对端」；跨网段 IP 同层 · find 聚焦粘贴 6 位；配对文件收进高级区；`verify:discover` · `verify:e2e-discover` 回归 ✅

## [1.54.0] - 2026-07-30

### Added

- **E2E 跨子网配对（SPRINT-DISCOVER-E2E-03）**：双实例 Playwright 勾选 `crossSubnet` share→join；`readHostShareEndpoint` / `joinWithPairingCodeCrossSubnet` helper；`discover-pairing-share-meta` · `discover-pairing-unicast-host` testid；`verify:e2e-pairing` 2 场景 ✅

## [1.53.0] - 2026-07-30

### Added

- **E2E 双实例配对（SPRINT-DISCOVER-E2E-02）**：Playwright 双 Electron `share→join` 全链；`LANPM_E2E_NAME` · UDP ephemeral 回退；`verify:e2e-pairing`；`docs/05` §1.2.6 ✅

## [1.52.0] - 2026-07-30

### Added

- **Renderer 发现弹窗 E2E（SPRINT-DISCOVER-E2E-01）**：Playwright + Electron；`data-testid` 发现/配对/组网帮助；`verify:e2e-discover`；`LANPM_E2E` 隔离启动；`docs/05` §1.2.5 ✅

## [1.51.0] - 2026-07-30

### Added

- **VirtualLan 故障注入（SPRINT-DISCOVER-TEST-04）**：`VirtualLanBus` 支持 `udpDropRate` / `udpDelayMs`；`verify:discover-sim-full` 追加 TCP-only 兜底 · UDP 黑洞 · 配对限流场景；`docs/05` §1.2.3–1.2.4 自动化 vs 手验对照 ✅

## [1.50.0] - 2026-07-30

### Added

- **VirtualLan 拓扑矩阵（SPRINT-DISCOVER-TEST-03）**：`verify:discover-sim-full`（9 场景：3 节点中继 · 跨子网路由/尾段/扫描 · 种子 SQLite · 群邀请 · 配对文件 · 入群申请）；`setRouteSubnetPrefixOverride` 测试 hook；`docs/配对码.md` §7 测试矩阵 ✅

## [1.49.0] - 2026-07-30

### Added

- **VirtualLan 测试总线（SPRINT-DISCOVER-TEST-02）**：`tests/helpers/VirtualLan.ts` 内存 UDP 转发；`RealNetworkTransport` 注入 `lanIp` / `createUdpSocket`；`verify:discover-sim`（2 节点 UDP 发现 + 配对码全链）；`docs/05` §1.2.2 ✅

## [1.48.0] - 2026-07-30

### Added

- **配对门禁纳入发版路径（SPRINT-DISCOVER-TEST-01）**：`verify:release-gate` 追加 `verify:pairing-code`（13 步协议/UI 回归）；`docs/05` §1.2.1 配对/发现自动化矩阵与 §6 真网边界说明 ✅

## [1.47.0] - 2026-07-30

### Added

- **发现页组网帮助（SPRINT-DISCOVER-HELP）**：抽取 `NetworkPrereqContent`；`NetworkHelpModal` 只读弹层；配对面板「组网帮助？」链接触发；`verify:discover-help`；`docs/配对码.md` §10 ✅

## [1.46.0] - 2026-07-30

### Added

- **macOS 路由 + `/24` 扫描（SPRINT-PAIR-04）**：`netstat -rn -f inet` 解析；可选 `subnetScan` 分批 `pairing_lookup`（发现页高级 · CLI `--subnet-scan`）；`verify:pairing-subnet-scan`；`docs/配对码.md` §5.3 P2 ✅

## [1.45.0] - 2026-07-30

### Added

- **Setup 组网说明步（SPRINT-SETUP-NET）**：身份表单前增加 `NetworkPrereqStep`（交换机 / 路由器 / 热点三场景 · 内联 SVG · Segmented 切换）；「已接好，继续」/「跳过」；纯教育 UI、不做真实网络检测；`verify:setup-net`；`docs/配对码.md` §10 · `docs/04` §1.7 ✅

## [1.44.0] - 2026-07-30

### Added

- **U 盘配对文件 + CLI（SPRINT-PAIR-03）**：`lanpm-peer.json` v1 schema（SHA-256 fingerprint）；GUI 导出/导入；`lanpm pairing start|join` CLI；`verify:pairing-peer` · `verify:pairing-cli`；`docs/配对码.md` §8 ✅

## [1.43.0] - 2026-07-30

### Added

- **路由表引导单播配对（SPRINT-PAIR-02）**：Win `route print` / Linux `ip route` 解析可达 `/24` 子网；`listRouteGuidedBroadcastAddresses` 合并路由前缀 + 网卡 + 种子；跨网段无 IP 时并行 `pairing_lookup` 到各子网 `.255`；`unicastHosts` 并行 UDP + TCP 逐 host 兜底；发现页跨网段默认只填码，IP/尾段收进高级折叠；`verify:pairing-route` 纳入 `verify:pairing-code`；`docs/配对码.md` §5.3 P1 ✅

## [1.42.0] - 2026-07-30

### Added

- **配对码全链路验收（TASK-PAIR-08）**：`verify:pairing-code` 聚合 UDP/TCP/跨网段/安全/中继/入群/发现 UI；`docs/02` §13.7
- **配对安全 TTL/限流（TASK-PAIR-07）**：`isPairingLookupRateLimited` 每分钟 lookup 上限；`PairingSessionHost` 记录 `lookupTimestamps`；失败 5 次锁定 + 一次性 `pairingId`；`verify:pairing-security`
- **跨网段 IP/尾段配对（TASK-PAIR-05）**：`pairingHostResolve` 尾段展开（如 `109`→各子网候选）与子网广播 lookup；`joinWithPairingCode` 多候选循环；发现页 `crossSubnet` + 分享屏展示 `localIpTail`；`verify:pairing-cross-subnet`
- **发现页群组中心 + 连接码 UI（TASK-PAIR-04）**：`DiscoverPairingPanel`（分享/查找连接码）；空态「用连接码查找群组」CTA；单群「申请加入」快捷条；高级折叠（种子/邀请码/手动节点）；`verify:discover` 扩展
- **群邀请码（TASK-PAIR-11）**：`group_invite_offer` / `lookup` / `found` UDP 报文；`GroupInviteSessionHost`（6 位码 · TTL · 一次性）；`GROUP_IPC` `startInvite` / `joinWithInvite`；发现页凭码直入群；`verify:group-invite`
- **入群申请 + 管理员审批（TASK-PAIR-10）**：`join_request` / `join_request_decision` P2P 报文；`group_join_requests` 表（schema v16）；发现群改为「申请加入」；群主审批/拒绝；`GROUP_IPC` 审批通道；`verify:join-request`
- **群组连接码 · UDP 配对（TASK-PAIR-01）**：`pairing_offer` / `pairing_lookup` / `pairing_found` 报文；`PairingSessionHost` 状态机（6 位码 · 5min TTL · 一次性）；`RealNetworkTransport.startPairingSession` / `joinWithPairingCode`；`verify:pairing-udp`
- **TCP `pairing_resolve` 兜底（TASK-PAIR-02）**：`pairing_resolve` / `pairing_resolve_ok` / `pairing_resolve_fail` wire 消息；`PeerLink.connectHostWithPairing`；`connectManualHostWithPairing`；跨网段 UDP 失败时凭 IP+码 建链；`verify:pairing-tcp`
- **IPC pairing + preload（TASK-PAIR-03）**：`PAIRING_IPC`（`pairing:start` / `pairing:cancel` / `pairing:join`）；`pairingService` 包装 transport；join 成功后写发现种子并刷新 snapshot；`verify:ipc-contract`
- **发现中继 `discover_relay`（TASK-PAIR-09）**：TCP 对端周期互推 peers/groups/seeds；`hop`≤2 转发；合并 `discoverGroupRegistry` 并自动连种子；`verify:discover-relay`
- **种子重连与群组缓存（TASK-PAIR-06）**：启动/发现时连接种子并等待 `peer_advert` 填充缓存；中继新种子持久化；`verify:discover-seeds-restart`

## [1.41.5] - 2026-07-29

### Fixed

- **EADDRINUSE 43124**：启用 Electron 单实例锁（关窗托盘驻留时再开 → 唤起已有窗口，不再崩溃）；TCP `listen` 增加 `error` 处理与 `reuseAddress`，端口被占时降级为仅出站连接并打日志

## [1.41.4] - 2026-07-29

### Fixed

- **跨子网 / 手动节点发现**：TCP 握手与 `peer_advert` 携带 `userId`、显示名与可发现群组；修复手动连接后「发现」列表为空（`userId` 为空被过滤、群组仅走 UDP 广播）
- **发现种子自动重连**：网络初始化时自动连接已保存的 `host:port` 种子

### Added

- `verify:manual-peer-discover` — 无 UDP 场景下手动 TCP 节点与群组广播回归

## [1.41.3] - 2026-07-29

### Fixed

- **打包版干净首启**：正式安装包（`app.isPackaged`）不再注入 `demo-*` 演示群，启动时 `purgeMockCatalog` 清除已有 mock；前端移除 `FALLBACK_GROUPS` 占位，无群时进入驾驶舱；开发环境 / `LANPM_DEMO=1` / 截图流水线行为不变
- **Windows exe 图标嵌入**：本地 `signAndEditExecutable: false` 规避 winCodeSign 符号链接问题；`rcedit` + `scripts/embed-win-exe-icon.mjs` 在 `--dir` 后嵌入 `resources/icon.ico`；`dist:win:x64` 改为 dir → embed → prepackaged NSIS

### Added

- `tests/unit/mock/seedMockData.test.ts` — `shouldSeedMockCatalog` 分支覆盖

## [1.41.2] - 2026-07-29

### Fixed

- **发版门禁**：README 版本徽章与中英文尾注同步至 `1.41.2`；`ai_messages` 外键移除 `ON DELETE CASCADE`（与 `verify:schema-fk` · 应用层 `deleteThread` 一致）

### Changed

- ESLint：清理未使用 import（`aiPatrolService` · `ipc/ai` · `systemTray` · verify 脚本）

## [1.41.1] - 2026-07-29

### Fixed

- **API Key 按身份持久化**：`ai_config` 由全局 singleton 改为按 `user_id` 隔离（schema v15）；迁移旧行到当前本机用户；`bindProfileAfterSetup` 写回 profile；配置弹窗展示 `apiKeyPersistHint`

## [1.41.0] - 2026-07-29

### Added

- **L3b 人审写库流水线（SPRINT-AI-07）**：`awaiting_confirm` 状态 · `resumePipeline` / `cancelPipeline` IPC · `taskRemediate` preset（单父任务提案 → 人审 → `confirmSubtasks` 落库）；`steps_json` 内嵌 `pendingConfirm`；驾驶舱需关注任务「补救拆分」· 助手入口与 preset · `verify:ai-pipeline-human` · `docs/AI接入.md` §6.5

## [1.40.1] - 2026-07-29

### Fixed

- **品牌图标一致性**：`appIcon` 多路径解析 + 绝对路径；`ensure-app-icons` 同步到 `out/resources`；Windows 打包恢复 `signAndEditExecutable` 以 rcedit 嵌入 exe 图标
- **关闭隐藏到托盘**：系统托盘 + 点关闭隐藏主窗口；托盘单击/双击恢复；托盘「退出」才真正结束进程

## [1.40.0] - 2026-07-29

### Added

- **L3a 项目健康检查流水线（SPRINT-AI-06）**：`aiPipelineRunner` + `healthCheck` preset（群概况 → LLM 风险摘要 → Top3 任务评审 → Markdown 报告）；`ai_pipeline_runs` 持久化；驾驶舱一键运行与助手续读

## [1.39.0] - 2026-07-29

### Added

- **AI 助手拆分与巡检续读（SPRINT-AI-03+）**：驾驶舱最近巡检「在助手中继续」注入 `formatPatrolSeedMarkdown`；助手在解析到单一任务上下文时展示「AI 拆分」并复用 `SubtaskPreviewModal`；新增快捷提示词「拆分子任务」「解读巡检」

## [1.38.0] - 2026-07-29

### Added

- **AI 端点探测（SPRINT-AI-04）**：`GET {baseUrl}/models` 轻量探测 · TTL 缓存（成功 5min / 失败 2min）；`canStream` 须端点可达；保存配置/启动 30s 后自动探；`ai:probeEndpoint` · 配置页「测试连接」· 助手不可达文案

## [1.37.1] - 2026-07-29

### Fixed

- **品牌图标一致性**：`build:icons` 改为纯 Node（`@resvg/resvg-js` + `to-ico`），不再依赖 ImageMagick；`predev` / `prebuild` 自动 `ensure-app-icons` 生成 `icon.png` / `icon.ico`；任务栏、exe、桌面通知与页内 favicon 均使用 `icon.svg` 同源图标

## [1.37.0] - 2026-07-29

### Added

- **AI 子任务拆分（SPRINT-AI-03）**：任务详情「AI 拆分」→ `proposeSubtasks` 结构化草案（Zod）→ `SubtaskPreviewModal` 勾选/编辑 → `confirmSubtasks` 批量 `createTask(parentTaskId)`；无 Key/外呼失败时本地规则降级
- **AI 定时巡检**：`aiPatrolService` 规则扫描逾期/落后/需关注；启动 5min 后首次跑、可配置 24h 间隔；Electron 通知 + `ai_patrol_runs` 持久化；驾驶舱最近巡检摘要；AI 配置页巡检开关

## [1.36.2] - 2026-07-29

### Added

- **Markdown 渲染（SPRINT-MD-01）**：共享 `MarkdownView`（`react-markdown` + GFM）；AI 助手消息渲染 MD，复制可选 Markdown / 纯文本；群聊 `ChatMessageText` 启发式 + `ai-assistant` 来源同样渲染（保留 `@` / `#任务`）

## [1.36.1] - 2026-07-29

### Fixed

- **群聊滚动**：打开群默认滚到最新消息；会话内切换群组恢复上次阅读位置（`data-msg-id` 锚点，不跨重启）

## [1.36.0] - 2026-07-29

### Added

- **AI 助手对话区（SPRINT-AI-UI-02）**：`AiMessageRow` 双方头像 + 时间戳 + 单条复制；多选批量复制/发到群聊；全屏宽屏右侧 `AiPromptRail` 快捷提问（点击直发）；Dock/Drawer 上方 chips；`shared/ai/promptPresets.ts`

## [1.35.1] - 2026-07-29

### Changed

- **AI 助手 UI**：Composer 与群聊同构（输入岛内嵌分享 + 圆形发送）；暗色气泡/壳层对齐 `--lanpm-*` 设计令牌

## [1.35.0] - 2026-07-29

### Added

- **AI 隐式上下文（SPRINT-AI-02）**：每次外呼 system 注入当前时间/用户/入口/网络；单群 KPI + attention Top5；任务载荷扩展 `scheduleHealth`/`daysUntilDeadline`/负责人/checklist；`context.taskId` 自动注入；`verify:ai-context`

### Fixed

- AI 助手：`window.lanpm` 缺 `ai` 命名空间时补齐桥接，避免 `onStreamChunk` 白屏

## [1.34.0] - 2026-07-29

### Added

- **AI 助手 MVP（SPRINT-AI-01）**：顶栏全局入口 + `AiAssistantShell`（Dock/Drawer/全屏）；主进程流式 IPC；本机 `ai_threads` / `ai_messages`；`#` 任务引用；驾驶舱「在助手中继续」；发到群聊（`meta.source: ai-assistant`）；任务详情提问与 AI 评审；`plugins/lanpm.ai-assistant` builtin 免费
- 验收：`verify:ai-thread-service` · `verify:ai-stream-ipc` · `verify:ai-offline-gate` · `verify:ai-desensitize`

## [1.33.9] - 2026-07-29

### Removed
- **手工截图**：删除 `docs/screenshots/manual/`（9 张 Snipaste）；不再保留手工对照图目录。

### Changed
- **README / README.zh-CN**：截图区注明无头 `screenshots:capture` · `screenshots:sync-readme`；开发者表补 README 截图命令；八大视图（含驾驶舱）。
- **文档**：`docs/screenshots/README.md` · `docs/05` · 评估归档去掉 `manual/` 引用。

### Release
- `v1.33.9` — 截图全自动 · 清理手工 Snipaste

## [1.33.7] - 2026-07-29

### Fixed
- **评估 P3 UX（SPRINT-11）**：日历常驻说明收进右上角 `?` Popover（`ViewHelpButton`）；白板首次进入 toast + 浮动 `?`、关联任务底角紧凑徽章；建群名称 placeholder zh/en 纯本地化示例。

### Changed
- **文档**：`docs/04` 日历/白板帮助降噪约定；评估稿 §3.5/3.6/3.9 P3 标 ✅；`verify:task-calendar` / `verify:whiteboard` 守卫帮助模式。

### Release
- `v1.33.7` — SPRINT-11 零散 P3 UX 抛光

## [1.33.8] - 2026-07-29

### Added
- **README 截图管线（SPRINT-13）**：`screenshots:capture` · `screenshots:sync-readme`；`light_*` → `assets/`（八视图 + 驾驶舱）；`verify:screenshots-sync`。

### Changed
- **README / README.zh-CN**：产品截图区扩展日历 · 白板 · 驾驶舱；移除过时 `export-gantt.png`。
- **基线**：`docs/screenshots/baselines/light/` 入库（含 `whiteboard`）；暗色基线补 `dark_whiteboard.png`。
- **发版**：`docs/05` · **release** skill 可选截图步（不进 `verify:release-gate`）。

### Release
- `v1.33.8` — SPRINT-13 README 截图同步

## [Unreleased]

### Changed
- **截图 SSOT（SPRINT-12）**：`snapshot/` → `docs/screenshots/`（`baselines/dark`）；`verify:visual-screenshots` EXPECTED 对齐八视图（18 PNG）；`verify:screenshots-layout` 入 `verify:p0`；`docs/04`/`docs/05` 路径与页数对齐。

## [1.33.6] - 2026-07-28

### Removed
- **死代码清理（SPRINT-09）**：删 `notificationService.ts` · `appStore.ts` · `getFsBlockersForStatus` · `plugins/lanpm.formjs/demo-schema.json`（form-js demo 以 `formJsDemoSchema.ts` 为 SSOT）。
- **评估稿归档**：根目录 `评估.md` 迁入 `archive/20260728_192629_手工截图UI评估_评估.md`。

### Fixed
- **死文档对齐（SPRINT-09）**：README 插件 loader 矛盾句；`docs/05` 生产包 `preview` 命令；`MIT开源替代` 七视图与插件 ✅；`docs/01` §1.3 存储与 §1.3.1 一致；`06_ROADMAP` 版本脚注；`00` 收录飞鸽；飞鸽 §8 链 MIT SSOT、去掉不可达 Growth 路径。
- **无用.md 收尾（SPRINT-10）**：`verify-storage-path-resolver` 入 `verify:p0`；`presenceLabel` 文档化；`build-icons` 停 `logo-32/64` + 栅格 gitignore；飞鸽 §7/§10 排期收敛 `06_ROADMAP`；README 文档表 · `docs/01` 标题 · `upgrade-node-24` 运维说明。

### Changed
- **审查稿归档（SPRINT-10）**：根目录 `无用.md` → `archive/20260728_204200_死代码死文档审查_无用.md`。

### Release
- `v1.33.6` — SPRINT-09/10 死代码死文档清理 · 评估/审查稿归档

## [Unreleased]

## [1.33.5] - 2026-07-28

### Fixed
- **评估 P3 UX（SPRINT-07）**：群级任务视图去掉重复 `ViewHeader`（底栏 Tab 表达模块）；驾驶舱有需关注任务时默认展开手风琴 Panel；`docs/04` §1.4 与 `verify:visual` 守卫同步。
- **无头截图种子（SPRINT-06）**：`visualCapture` 在 mock 任务已有排期时仍插入 `截图·设计评审`；甘特条等待改行去重计数；`verify:visual-screenshots` 本地稳定绿；暗色七页归档 `snapshot/dark/`。
- **任务树详情叠字**：移除描述区 `flex:1`，详情字段 `flex-shrink:0`，避免检查项/插件区被压扁重叠。
- **评估 P2 UX（SPRINT-05）**：示例插件默认关闭；文件页自动选中首项预览；顶栏状态点 tooltip 含网络+未读/看板角标说明；看板延期左边条+角标、meta 中性色。
- **手工截图 UX Sprint（SPRINT-04）**：底栏选中态去掉底色块（`docs/04` §1.6）；聊天上下文条仅保留在线人数；甘特延期条深红对比度；日历 `dayMaxEvents=3` + popover；主进程桌面通知 IPC + `setName`/`AUMID`/`.ico`；`electron-builder` 改用 `signAndEditExecutable: false` 规避 winCodeSign 符号链接失败。
- **打包版 UI 扁平/无边界（TASK-002）**：`global.module.css` 改为 `global.css`；生产构建单独输出 `global-*.css` 并由 `index.html` 引用，设计令牌（`--lanpm-border` 等）不再在 asar 中丢失。
- **桌面通知 / 消息框 Electron 默认图标（TASK-001）**：Renderer 通知统一 `desktopNotification` 并传入 `resources/icon.png`；主进程 `Notification` 使用 `resolveAppIconPath()`；`electron-builder` 配置 `win.icon` + `sign: null`（保留 rcedit）；Windows `setAppUserModelId`。
- **打包后 renderer 崩溃 `__commonJSMin is not a function`**：Vite 8 / Rolldown `chunkOptimization` 将 CJS helper 与 lazy chunk 打成循环依赖；`electron.vite.config.ts` 对 renderer 关闭该优化（rolldown#8361）。
- **安装包虚胖（SPRINT-02-pack-size）**：asar 排除已 bundle UI / 源码旧产物；renderer-only 依赖改 `devDependencies`；Electron locales 仅 en-US+zh-CN；白板/日历/甘特 `React.lazy` + 导出动态 import。**Setup x64 ~316 MB → ~192 MB**；asar ~251 MB → ~30 MB。
- **打版门禁（SPRINT-08）**：补全 `MessageKey`（顶栏角标 tooltip · 看板延期徽章）；`notification:show` 纳入 `NOTIFICATION_IPC` 契约；移除 `ChatView` 未使用 import。

### Changed
- **Super Cursor 母版**：`roles.json` 12 人格与 `run-start` Persona 注入；`master` 路由补 `review` / `debug` / `pencil-design`；`plan` 增 PRD 丰富与优先级参考；`review` / `pencil-design` skill 与 reference；`verify-super-cursor` · `cursor-coherence` 扩展；docs 目录与协作规则同步。

### Release
- `v1.33.5` — SPRINT-04～07 UX 评估闭环 · 截图 CI · P3 抛光 · verify:release-gate 全绿

## [1.33.4] - 2026-07-15

### Fixed
- **README 版本漂移**：`v1.33.3` 打版后 `README.md` / `README.zh-CN.md` 徽章与 Current 行同步 `package.json`；`verify:project` 全绿。
- **verify:m6 端口冲突**：集成测改用动态空闲端口，避免 `EADDRINUSE` 导致 `verify:m7` 假失败。

### Release
- `v1.33.4` — README version sync · verify:m6 dynamic ports

## [1.33.3] - 2026-07-15

### Changed
- **onekey 交互菜单精简（`onekey_run.sh` / `.bat` / `.ps1`）**：主菜单保留日常开发 + `build`/`install`/`clean`/`pack`；`check`/`verify`/`rebuild`/`preview`/`clean deep` 收入「更多维护」子菜单；`check` 合并为一项并询问是否跑 `verify:m0`；减轻 `cls` 清屏残影；`bat` 提示去掉 `[]` 并修剪选项空格。

### Release
- `v1.33.3` — onekey interactive menu slim (main + more submenu)

## [1.33.2] - 2026-07-15

### Fixed
- **Windows 验证串联**：`tests/spawnNpm.ts` 统一 `npm run` 跨平台调用（`win32` 启用 `shell`），修复 `verify:p0` / `verify:shared` / `verify:coverage` 在 Windows 上 `ENOENT` 假失败。
- **stub-parity CRLF**：`verify-stub-parity` 归一化 `\r\n`，修复 Windows 检出下 marker 匹配失败。

### Release
- `v1.33.2` — Windows verify:m7 regression green

## [1.33.1] - 2026-07-15

### Added
- **onekey 启动预检（`scripts/onekey-preflight.mjs`）**：`start`/`web`/`build` 前自动检测关键依赖与 native ABI；缺包时 `--fix` 自动 `npm install`；启动失败时解析 `.lanpm/dev.log` 并给出修复建议；三端 `onekey_run.{sh,bat,ps1}` 集成。

### Fixed
- **Windows Profile 迁移**：旧版 `lanpm.db` 无 `files` 表时迁移不再崩溃；迁移中断后自动从 `profiles/<id>/` 恢复 `active_profile.json` 绑定。

### Release
- `v1.33.1` — Windows dev startup: profile migration guard · onekey preflight auto-fix

## [1.33.0] - 2026-07-15

### Added
- **驾驶舱部门手风琴（TASK-CK-414）**：部门完成率默认摘要（整体% · 最差部门进度条），展开行列表；`deptList` 明确 `overflow:visible` / `max-height:none`，随 `scrollBody` 滚、不抢第二竖滚条。
- **驾驶舱列表手风琴（TASK-CK-413）**：需关注任务默认摘要（条数 + Top 2），展开完整列表与操作；项目进度默认最差项目进度条，展开卡片列表；`verify:visual` 守卫默认收起。
- **驾驶舱 Panel 手风琴基元（TASK-CK-412）**：`defaultCollapsed` / 受控 `expanded`+`onExpandedChange`；`summary` 摘要槽 + 详情 `children`；`aria-expanded` 与 Enter/Space 键盘可达；`verify:visual` 守卫。

### Changed
- **驾驶舱密度手风琴文档收口（TASK-CK-415）**：`docs/01` §12.1 · `docs/04` · `docs/05` 对齐领导摘要单岛 + 列表默认摘要手风琴 IA；`verify:visual` 全量 CK-410～414 守卫 + 文档互链。
- **驾驶舱领导摘要去重（TASK-CK-411）**：合并执行摘要与 KPI 四卡为**单一**领导摘要岛（八指标两排紧凑）；删除独立 `kpiGrid` 双岛；`verify:visual` 禁双岛回归；`docs/01` §12.1 · `docs/04` · `docs/05` 对齐。

### Fixed
- **驾驶舱展开裁切（hotfix）**：`scrollBody` 子项 `flex-shrink: 0`，修复手风琴展开后列表被 flex 压缩裁切、主区无纵向滚动条的问题。
- **驾驶舱主滚动（TASK-CK-410）**：`mainCockpit flex:1 1 0` 加固高度链；移除 `deptList` 默认嵌套 `overflow-y:auto`，部门列表随 `scrollBody` 统一纵向滚动；`verify:visual` 守卫。

### Release
- `v1.33.0` — cockpit density accordion (CK-410–415): single leadership summary island · default-collapsed list accordions · scrollBody scroll contract

## [1.32.0] - 2026-07-15

### Added
- **驾驶舱周趋势（TASK-CK-407）**：本周 vs 上周完成数环比 + 里程碑完成对比；`buildWeeklyTrend` 聚合与单元测；环比并入执行摘要；`verify:visual` 守卫。
- **驾驶舱需关注任务（TASK-CK-404）**：延期/落后任务 Top 8 列表（项目·任务·负责人·截止日）；点击进看板；`buildAttentionTasks` 单元测。
- **驾驶舱执行摘要（TASK-CK-403）**：本周完成 / 进行中 / 风险项目 / 下周到期；`buildExecutiveSummary` 聚合 + 首屏岛式摘要条；单元测覆盖。

### Changed
- **驾驶舱领导视图（TASK-CK-401～409）**：`mainCockpit` + `scrollBody` 单滚动契约；需关注 → 执行摘要 → KPI → 任务列表 → 项目健康 → 部门完成率 → 报表置底；文档 SSOT（`docs/01` §12 · `docs/04` · `docs/05`）。
- **驾驶舱首屏 IA 去重**：执行摘要合并周趋势（本周完成 / 环比 / 下周到期 / 需关注任务数）；KPI 四卡专注项目健康（总数 / 进行中 / 风险 / 延期）。
- **驾驶舱 AI 报表层级（TASK-CK-408）**：周报主 CTA；月报默认、AI 评估 text 次要；报告区置底、可折叠 teaser；`verify:visual` 守卫。
- **驾驶舱部门完成率（TASK-CK-406）**：紧凑行；列表限高可滚动；`resolveDeptDoneCount` 兼容旧 IPC。
- **驾驶舱项目健康（TASK-CK-405）**：紧凑卡片列表（状态 pill + 进度/元数据同行）；`verify:visual` 守卫。
- **视觉抛光 II（TASK-VP-404～407）**：聊天气泡/composer 岛面；顶栏窄屏平铺；日历 FC 令牌映射；Tab 轻过渡；`ViewState` 统一空态；`docs/04` §1 同步。

### Fixed
- **驾驶舱滚动**：`.root overflow:hidden` · `scrollBody flex:1 1 0`；修复底部裁切无滚动条（TASK-CK-401）。
- **部门完成率 `undefined`**：`resolveDeptDoneCount` 反推完成数；执行摘要不再强依赖 `weeklyTrend`。
- **顶栏垂直对齐**：群切换器与全局搜索外层锁 32px；搜索灰底移至 selector。

### Release
- `v1.32.0` — cockpit leader view (CK-401–409) + visual polish II tail (VP-404–407)

## [1.31.0] - 2026-07-14

### Changed
- **视觉抛光 II（TASK-VP-403）**：驾驶舱去 Ant 后台感 — 自定义 KPI 岛式网格与 `Panel` 分区；语义状态 pill；进度条走 `--lanpm-accent` / warning / danger；`verify:visual` 禁 `Card`/`Statistic` 回退。
- **视觉抛光 II（TASK-VP-402）**：清扫聊天 `#007a3d`、日历 FC 幻影令牌/hex fallback、任务族/工期健康度散落色；新增 `--lanpm-task-family-*`；`verify:visual` 禁 module 内 legacy hex 与 `var(--lanpm-*, #hex)` fallback。
- **视觉抛光 II（TASK-VP-401）**：设计令牌 SSOT — 新增 `src/shared/design/lanpmDesignTokens.ts`；`ThemeProvider` / 头像 / 任务族色 / 甘特 fallback 统一亮 accent `#0066cc`；`--lanpm-accent-ring` 与 `docs/04` · `UI优化.md` 圆角阶对齐；`verify:visual` 增加 SSOT 交叉校验。
- **`.cursor` Super Cursor 母版**：plan/run/release 引用分层 · week/disk/maintain 指令与 skill · delivery/plan reference · prompt-security · resolve-role · cursor-coherence 扩展。
- **Dev 稳定性**：Linux inotify 不足时 Vite 自动轮询 watch；`dev-run` / `onekey_run` 与 `electron.vite.config` 忽略 `.cursorGrowth` 等路径。

### Fixed
- **Linux dev 热更新**：`electron.vite.config` / `dev-run` 在低 inotify 上限时自动轮询 watch，缓解 `ENOSPC`。
- **开发体验**：Linux inotify 不足时 Vite 自动轮询 watch；`dev-run` / `onekey_run` 支持 `--web` 快捷入口。

### Release
- `v1.31.0` — design token SSOT + Super Cursor sync

## [1.30.1] - 2026-07-14

### Added
- **SPRINT-MEETING-PLUGIN-SPIKE（SPIKE-374–376）**：可购会议插件 `lanpm.meeting` 架构拍板 — Lite **mesh** + Host 投屏代理 vs Pro **LiveKit 自托管**（Jitsi Plan B）；必扩 `chat.toolbar.media` Slot 与媒体 capability；禁默认公有云 SFU；`npm run verify:meeting-spike`。详 `archive/20260714_214500_meeting_plugin_spike.md` · `docs/06` §3。

### Fixed
- **`verify:plugin-spike` / `verify:meeting-spike`**：改经 `run-electron-node.mjs` 执行，避免系统 Node 20 不支持 `--experimental-strip-types` 导致验收失败。

### Release
- `v1.30.1` — meeting plugin architecture SPIKE

## [1.30.0] - 2026-07-12

### Changed
- **领导驾驶舱**：`riskProjectCount` KPI；项目按延期→风险→正常排序；「需关注」条；周报为主 CTA（API Key / 返回降噪）；岛感 KPI/列表/报表面板（亮暗）；`docs/01` §12 / `docs/04` 对齐。

### Release
- `v1.30.0` — executive cockpit chrome

## [1.29.0] - 2026-07-12

### Changed
- **视觉气质（Excalidraw chrome）**：亮/暗双主题圆角阶 8/12/16/20；新增 `--lanpm-selected-bg` / `--lanpm-shadow-island` / `--lanpm-surface-elevated`；Ant `ThemeProvider` 与壳层（TopBar / BottomNav）通栏岛感；聊天/看板/树/甘特/日历/文件/发现/驾驶舱表面与选中态对齐；`docs/04` 写入气质 SSOT（含暗色成对规则）；修正顶栏宽屏平铺说明。
- **`verify:visual`**：经 Electron Node 运行，避免宿主 Node 20 无 strip-types 导致闸门失败。

### Release
- `v1.29.0` — Excalidraw chrome vibe (light + dark)

## [1.28.0] - 2026-07-12

### Changed
- **`.cursor` 母版**：吸收通用二级/三级 SOP — `oss-first`（开源优先）· `input-bounds`（边界/默认拒绝）· `extensibility`（可选扩展宿主）；扩 `submodule`/`security`/`api`/`plan`/`delivery`/`docs`/`release`/`async-progress`/`long-running-ui`；**无**新 slash skill/agent；根 README 补 Agent workflow 门面（`cursor-coherence`）。
- **顶栏**：宽屏将「更多」中的驾驶舱 / 发现 / 建群 / 解散平铺为图标+文字（对齐底栏 Tab 风格）；≤1100px 仍收纳到「⋯」。
- **docs**：`06_HISTORY.md` 移出 `docs/` → `archive/20260712_003457_docs06_验收里程碑_已交付归档.md`；`docs/` 仅长期 SSOT（`06_ROADMAP` + 01–05）；已交付对外以 `CHANGELOG` 为准。
- **审查收口（DOC-340–343）**：边界值专项手验（autoDiscover / 限速 / 续传 offset）以单测代理通过；根目录 `审查.md` 迁 `archive/20260712_004439_审查_边界值闭环.md`。

### Release
- `v1.28.0` — cursor SOP absorb + TopBar wide actions + review hand-verify close

## [1.27.0] - 2026-07-12

### Changed
- **docs**：`07_跨平台发版矩阵` 并入 [docs/05 §1.4](./docs/05_测试与联调发布.md#14-跨平台发版矩阵)；旧 `06_验收与里程碑计划` 拆为 ROADMAP（未完成）+ 历史归档（后迁 `archive/`）；可购会议插件拍板（[06_ROADMAP](./docs/06_ROADMAP.md) §3）；`verify:platform-matrix` / `verify:docs-links` 对齐。
- **docs/06**：拍板 **可购会议插件**（语音 / 视频 / 屏幕共享 / 会议室）— 不进核心；`lanpm.meeting` 一包多档（Lite mesh / Pro SFU）；信创离线许可证；落地序对齐。README 规划句同步。

### Fixed
- **SPRINT-B6-BOUNDARY-MINOR（TASK-330–335）**：审查 Minor 收尾 — 续传 `startOffset` clamp；限速 `rateKbps` 上限 `100_000`；新建群 `autoDiscover` 默认 false；chat sync `catchSyncFailure` 可观测；`listDueSyncOutbox` limit clamp（默认 50 / 上限 500）。

### Release
- `v1.27.0` — B6 boundary Minors + docs ROADMAP split

## [1.26.0] - 2026-07-12

### Fixed
- **SPRINT-B5-BOUNDARY（TASK-320–325）**：消化边界值/默认值审查 — bundle 导出**最新优先**+截断提示；导入 SQLite 事务 + `conflictMode` 白名单 + 口令≥4；`new_id` 外键重映射；进度全路径 clamp；`LANPM_TCP_PORT` 校验回退；插件未配置默认拒绝（官方白名单默认启用）。

### Release
- `v1.26.0` — B5 boundary / defaults harden

## [1.25.0] - 2026-07-11

### Added
- **SPRINT-B3-BACKUP（TASK-310–314）**：单群加密 bundle 加固 — `overwrite` 冲突模式、`previewGroupBundle` dry-run、tags/成员/清单/CRDT·白板快照；导入前摘要与覆盖二次确认；`verify:bundle`；docs/06 · 飞鸽信创「可迁移、不出域」· README 对齐。

### Fixed
- **`groupTagMetaRepository` ESM 导入**：补 `.ts` 扩展名，修复 `ELECTRON_RUN_AS_NODE` 下依赖任务仓库的 verify 解析失败。

### Release
- `v1.25.0` — B3 backup/restore harden

## [1.24.0] - 2026-07-11

### Added
- **SPRINT-B4-SYNC-OUTBOX（TASK-300–303）**：`sync_outbox`（schema v11）— task/file/tag publish 失败持久排队、周期/重连 flush；`verify:sync-outbox`；docs/06 · README 对齐。

### Release
- `v1.24.0` — B4 weak-net sync outbox

## [1.23.0] - 2026-07-11

### Added
- **SPRINT-PLUGIN-ENABLE-UI（TASK-295–299）**：Profile「扩展」Tab 启停官方插件；详情槽监听启停事件重拉；`verify:plugin-enable-ui`。

### Fixed
- **Profile 非资料 Tab 页脚**：去掉「Cancel + 取消」双按钮；扩展/数据 Tab 仅「关闭」；官方插件名走 i18n。

### Release
- `v1.23.0` — Profile extensions tab (plugin enable UI)

## [1.22.0] - 2026-07-11

### Added
- **SPRINT-PLUGIN-FORMJS（TASK-289–294）**：插件 loader 最小闭环 — `plugins/` manifest 发现、能力白名单 IPC、`task.detail.section` SlotHost + ErrorBoundary；官方 stub + **form-js 可购 POC**（schema 兼容渲染，不进核心 deps）；`verify:plugin-loader`。

### Changed
- **docs/06**：对齐 v1.10–v1.22 — 七 Tab、P1 已交付/待做分表、§2.3 已闭合 vs 仍开、§16.2 七视图、§6 增量候选刷新；文档体系含 `docs/07`。
- **onekey_run.sh / .bat / .ps1**：菜单每次重绘时重读 `package.json` 版本，避免长驻交互菜单一直显示旧号。

### Release
- `v1.22.0` — plugin loader + form-js POC

## [1.21.0] - 2026-07-11

### Added
- **SPRINT-B2-MEMBER-SEARCH（TASK-284–288）**：`matchesMemberSearch`（显示名 / mentionKeys · 汉字 · 拼音）；看板负责人筛选（可与标签叠加）；指派 Select 可搜拼音；聊天侧栏成员搜索；`verify:member-search`。

### Release
- `v1.21.0` — B2 member search (pinyin / keyword)

## [1.20.0] - 2026-07-11

### Added
- **SPRINT-A1-NUDGE（TASK-279–283）**：任务到期桌面提醒（可关）· 聊天 `@负责人` 别名置顶 · 详情「催办负责人」预填群聊；`verify:a1-nudge`。

### Changed
- **README / README.zh-CN**：对齐当前产品面 — 七视图（含日历、白板）、A2–A5 / Presence / 标签 / 清单 / 跨平台矩阵；技术栈与路线图去重；补 docs/03·07 与飞鸽对照入口。

### Release
- `v1.20.0` — A1 due nudge / @assignee

## [1.19.0] - 2026-07-11

### Added
- **SPRINT-A4-TRANSFER-UX（TASK-270–275）**：传输取消 / 失败重试 / 速率·ETA；`cancelTransfer` IPC；活动队列取消按钮；历史重试；`verify:transfer-a4`。
- **SPRINT-PLUGIN-SPIKE（SPIKE-276–278）**：插件加载边界与扩展点拍板 — `PluginManifest` / Slot / 能力白名单 stub；安全红线；form-js 走可购插件不进核心；`verify:plugin-spike`。

### Release
- `v1.19.0` — transfer A4 UX + plugin load-boundary SPIKE

## [1.18.0] - 2026-07-11

### Added
- **SPRINT-PLATFORM-MATRIX（TASK-264–269）**：跨平台发版矩阵 — builder 显式 x64+arm64；`dist:*`；ensure-native 含 node-screenshots；Release CI 补 mac x64 / linux arm64；`docs/07` + `verify:platform-matrix`。

### Release
- `v1.18.0` — cross-platform x64+arm64 packaging matrix

## [1.17.0] - 2026-07-11

### Added
- **SPRINT-WB-REALTIME（TASK-258–263）**：群内白板实时同画 — `whiteboard_crdt*` / `whiteboard_awareness`；schema v10 `whiteboard_crdt_docs`；`@mizuka-wu/y-excalidraw` Binding；指针 Awareness；`sceneJson` seed/回写；assets 体积守卫；`verify:whiteboard-realtime`。
- **SPRINT-A3-PROJECT-FILES（TASK-245–249）**：项目级文件 / 交付物 — `deliverables` 派生索引；文件 Tab「全部 / 交付物」与按任务筛选；挂接/解挂；跳转看板；`verify:project-files`。
- **SPRINT-A5-DISCOVER（TASK-250–254）**：发现加固 — health reason code；snapshot 健康态；空态/失败 CTA；发现种子持久化与刷新连接；`verify:discover-a5`。

### Changed
- **白板实时协同 SPIKE（SPIKE-255–257）**：拍板主路径 = 群级 Y.Doc + y-excalidraw + P2P（镜像 `task_crdt`）；拒绝公网 room；实现 Sprint 已交付。

### Release
- `v1.17.0` — project deliverables A3 + discover A5 + whiteboard realtime CRDT

## [1.14.0] - 2026-07-11

### Added
- **SPRINT-CALENDAR-DRAG（TASK-240–244）**：日历拖拽/拉伸改期 — FC exclusive-end 映射；`@fullcalendar/interaction`；推断排期拖动落库；`verify:calendar-drag`。

### Release
- `v1.14.0` — calendar drag/resize reschedule

## [1.13.0] - 2026-07-11

### Added
- **SPRINT-P1-3-CHECKLIST（TASK-235–239）**：任务验收清单 — schema v9；详情增删改勾选与进度；未完成项建子任务；`verify:checklist`；飞鸽 P1-3 对齐。

### Release
- `v1.13.0` — task acceptance checklist (P1-3)

## [1.12.0] - 2026-07-11

### Changed
- **白板工具栏**：去掉「保存 + 提示」整行（已自动保存）；导出 / 禅模式改挂 Excalidraw `renderTopRightUI`；禅模式隐藏顶栏/底栏/标题，Esc 退出。
- **底栏 Tab**：悬停/按压微动效（图标轻抬与回弹），增强无底块时的触感。

### Added
- **SPRINT-A2-MSG-TASK（TASK-230–234）**：消息↔任务双向 — `sourceMsgId`/`linkedFileIds`（schema v8）；气泡一键建任务；讨论发 `task_ref` + 详情讨论区；文件挂任务；`verify:message-task`。
- **SPRINT-WHITEBOARD（TASK-225–229）**：第 7 Tab 协作白板（Excalidraw）；群级场景持久化；任务关联；导出 PNG→群文件；`verify:whiteboard`。

### Release
- `v1.12.0` — whiteboard (7th tab) + message↔task A2 loop

## [1.10.0] - 2026-07-11

### Fixed
- **甘特滚动/视口**：日期头与水平滚动条固定（垂直滚动不再带走表头）；打开时以今日为中心；工具栏增加放大/缩小。
- **日历空窗**：无 `startDate`/`endDate` 的任务改为与甘特相同默认排期展示（虚线样式）；修复日历区域高度，避免事件不可见。

### Added
- **SPRINT-TASK-CALENDAR 收尾 (TASK-224)**：`verify:task-calendar`；docs/03·04 六视图；README；归档；可 handoff `/release` **1.10.0**。
- **日历接线 (TASK-223)**：Router · BottomNav 第 6 Tab（甘特与文件之间）· i18n；点击打开 TaskEditModal。
- **FullCalendar 视图 (TASK-222)**：`CalendarView` 月/周；主题 token；只读不拖拽。
- **日历事件契约 (TASK-221)**：`tasksToCalendarEvents`（仅有日期；endDate=到期）；单测。
- **六视图导航 (TASK-220)**：`AppView` 增 `calendar`；`VIEW_TABS` 顺序 gantt→calendar→files。

### Release
- `v1.10.0` — task calendar (6th tab) + gantt viewport UX（TASK-220–224）

## [1.9.0] - 2026-07-11

### Added
- **SPRINT-FORCE-DICT-TAGS 收尾 (TASK-213)**：`verify:group-tag-dict` 断言强制字典；docs/03·04；归档；可 handoff `/release` **1.9.0**。
- **标签强制字典 UI (TASK-212)**：`TaskEditModal` / `TaskDetailPanel` 改为 `Select mode="multiple"` + 字典 options；空字典提示。
- **标签强制过滤主路径 (TASK-211)**：create/update（main · repo · stub）经 `filterTagsToGroupDict`；空字典→空 tags。
- **标签强制字典契约 (TASK-210)**：`filterTagsToGroupDict` + 单测。
- **SPRINT-BADGE-WEAK-HINT 收尾 (TASK-209)**：扩展 `verify:badge-semantics`；docs/03·04 弱红点语义；归档。
- **看板弱红点 UI (TASK-208)**：BottomNav 数字优先，否则 `Badge` `dot`；进入看板 mark seen。
- **弱红点桥接 (TASK-207)**：`boardLatestUpdatedAt` Stub/store；本机 `lastBoardSeenAt`。
- **弱红点契约 (TASK-206)**：`shouldShowBoardRecentDot`（48h ∩ unseen）；`getBoardLatestUpdatedAt`；单测。

### Release
- `v1.9.0` — board recent weak dot + force task tags from group dictionary（TASK-206–213）

## [1.8.0] - 2026-07-11

### Added
- **SPRINT-NAV-BADGE-UX 收尾 (TASK-205)**：`verify:badge-semantics`；docs/03·04·06·README 对齐角标语义；归档；handoff `/release` → **v1.8.0**。
- **顶栏网络点切换微动效 (TASK-204)**：`linkState` 变化时一次缩放反馈；尊重 `prefers-reduced-motion`。
- **底栏看板角标接线 (TASK-203)**：`BottomNav` 使用 `boardMineOpen`；聊天仍 `chatUnread`。
- **Stub / badgeStore 对齐 (TASK-202)**：browser stub 用 `countMineOpenTasks`；store 空态 `boardMineOpen`。
- **看板角标语义契约 (TASK-201)**：`GroupTabBadges.boardMineOpen`；`shared/badge/mineOpen`；`badgeService.countMineOpenTasks`（指派给我且 todo/doing）；单测。

### Changed
- **看板 Tab 角标**：由「群内全部 `todo`」改为「指派给本地用户且未完成（todo/doing）」；字段 `boardTodo` → `boardMineOpen`。

### Release
- `v1.8.0` — 导航角标与我相关：`boardMineOpen`、聊天未读、网络点切换微动效（TASK-201–205）

## [1.7.0] - 2026-07-11

### Added
- **SPRINT-TEXT-CARET-AWARENESS 收尾 (TASK-200)**：`verify:text-caret`；docs/04·06·README 对齐描述框协同光标；归档；handoff `/release` → **v1.7.0**。
- **描述框 caret 接线 (TASK-199)**：TaskDetailPanel + TaskEditModal 挂 overlay；选区变化广播 caret。
- **RemoteCaretOverlay (TASK-198)**：彩色竖线 + 显示名；按 UTF-16 offset 定位；i18n。
- **caret 桥接 (TASK-197)**：store `descriptionCarets`；`useDescriptionCaretBroadcast`；失焦清除。
- **caret 透传验收 (TASK-196)**：`verify:task-awareness` 覆盖含 caret 的 Awareness round-trip。
- **文本 caret 协议 (TASK-195)**：`TaskAwarenessLocalState.caret`（`description` + UTF-16 offset）；校验/单测；docs/03。

### Release
- `v1.7.0` — 描述框协同文本 caret：`task_awareness.caret`、详情/看板弹窗竖线+名（TASK-195–200）

## [1.6.0] - 2026-07-11

### Added
- **SPRINT-GROUP-TAG-DICT 收尾 (TASK-194)**：`verify:group-tag-dict`；docs/04·06·README 对齐群标签字典；归档；handoff `/release` → **v1.6.0**。
- **群标签字典协议 (TASK-189)**：`GroupTagMeta` / `GroupTagPatchPayload`；`SyncMessageType.group_tag_patch`；docs/03；`verify:sync-handlers` 登记。
- **群标签字典持久化 (TASK-190)**：schema v6 表 `group_tag_meta` + migrate；repository；删群级联。
- **群标签字典同步 (TASK-191)**：`groupTagSyncService` publish/apply `group_tag_patch`；匿名群跳过；挂入 taskSync。
- **群标签字典桥接 (TASK-192)**：IPC list/upsert/remove/import；preload · lanpm-api · browser stub；本机色一次性导入。
- **群标签字典 UI (TASK-193)**：`groupTagStore`；BoardTagPalette/芯片/详情读群字典；改色走 IPC；i18n「已同步」提示。

### Release
- `v1.6.0` — 群标签色字典：`group_tag_meta` / `group_tag_patch` LWW（TASK-189–194）

## [1.5.0] - 2026-07-11

### Added
- **SPRINT-BOARD-TAG-FILTER 收尾 (TASK-188)**：`verify:task-tags-filter`；docs/04·06·README 对齐标签筛选/本机色板；归档；handoff `/release` → **v1.5.0**。
- **看板标签筛选与色板 (TASK-184–186)**：工具栏多选 OR 筛选；KanbanCard 着色芯片；本机色板（uiStore/localStorage）。
- **任务详情标签色 (TASK-187)**：详情面板芯片与看板同色逻辑。
- **标签筛选/色哈希 (TASK-183)**：`filterTasksByTags`（OR）· `collectUniqueTaskTags` · `tagColorHash` / `resolveTagColor` + 单测。

### Release
- `v1.5.0` — 看板标签 OR 筛选 + 本机色板（TASK-183–188）

## [1.4.0] - 2026-07-11

### Added
- **SPRINT-TASK-AWARENESS 收尾 (TASK-182)**：`verify:task-awareness`；docs/06·README 对齐焦点 Presence；归档；handoff `/release` → **v1.4.0**。
- **任务树焦点 Presence UI (TASK-181)**：树行显示远端焦点点；选中任务时广播本地焦点。
- **看板焦点 Presence UI (TASK-180)**：KanbanCard 显示远端查看者；编辑任务时广播本地焦点；i18n。
- **task_awareness 桥接 (TASK-179)**：IPC `setAwareness`/`listAwareness`；push `task:awareness`；渲染进程 store；离开可清焦点。
- **task_awareness 主进程 (TASK-178)**：群 Y.Doc 挂 Awareness；publish/apply `task_awareness`；`setLocalTaskAwareness`；≥200ms 节流；匿名群不广播。
- **task_awareness 协议 (TASK-177)**：依赖 `y-protocols`；`TaskAwarenessPayload` / 本地焦点态校验；`SyncMessageType.task_awareness`；docs/03 §6.2·§10；`verify:sync-handlers` 登记。

### Release
- `v1.4.0` — 任务焦点 Presence：`task_awareness`、看板/树远端焦点指示（TASK-177–182）

## [1.3.0] - 2026-07-11

### Added
- **SPRINT-BOARD-TAGS 收尾 (TASK-176)**：docs/03·04·06·00、README 对齐独立标签；Sprint VERIFY；归档；handoff `/release` → **v1.3.0**。
- **任务树详情标签 (TASK-175)**：TaskDetailPanel 可编辑独立标签，与看板编辑对齐。
- **看板标签 UI (TASK-174)**：TaskEditModal 编辑多标签；KanbanCard 展示（与优先级 Tag 区分）；i18n。
- **任务 tags 薄同步 (TASK-173)**：`task_crdt` 字段 `tags`；browser stub create/update；`verify:task-sync` 回归。
- **任务 tags 持久化 (TASK-172)**：schema v5 `tasks.tags_json` + migrate；repository 读写 / create·update。
- **任务独立标签类型 (TASK-171)**：`Task.tags` / Create·Update；`normalizeTaskTags`（trim/去重/上限）+ 单测。

### Release
- `v1.3.0` — 看板独立标签：`Task.tags` / `tags_json`、看板/详情编辑、薄同步（TASK-171–176）

## [1.2.0] - 2026-07-11

### Added
- **SPRINT-FILE-RESUME 收尾 (TASK-170)**：docs/06 §2.3·§6、docs/00/05、README 对齐 P2P pull 断点续传；Sprint VERIFY；归档；handoff `/release` → **v1.2.0**。
- **file_pull 续传验收 (TASK-169)**：`verify:file-resume`（中断后 `fromOffset` 续传拼完整文件）；`package.json` 脚本。
- **FilesView 远端下载续传 UX (TASK-168)**：失败/中断下载显示「续传下载」与进度提示；传输历史可续传并标注方向。
- **file_pull 续传 API (TASK-167)**：`pullRemoteFile` 读 `.partial`/SQLite 进度发 `fromOffset`；`resumeTransfer` 支持 download 方向。
- **file_pull 接收端落盘 (TASK-166)**：pull 会话写入 `{fileId}.partial` + SQLite download `file_transfers` 进度；进程可恢复；去掉内存 `pullBuffers`。
- **file_pull 发送端续传 (TASK-165)**：`handleFilePullRequest` 校验 payload 并从 `fromOffset` 起发 `file_chunk`。
- **file_pull_request 续传协议 (TASK-164)**：`FilePullRequestPayload.fromOffset` + 校验；`docs/03` 对齐实现中的 `FileChunkPayload` 形状。

### Release
- `v1.2.0` — P2P `file_pull` 断点续传：`fromOffset`、`.partial` 落盘、SQLite 进度、FilesView 续传 UX（TASK-164–170）

## [1.1.0] - 2026-07-11

### Added
- **SPRINT-TASK-CRDT 收尾 (TASK-163)**：docs/06 §2.3·§6 与 docs/00 / README 对齐 Yjs `task_crdt` 已交付；归档 `20260711_112900_task_crdt_sprint_summary.md`；handoff `/release` → **v1.1.0**。
- **任务详情双写闭环 (TASK-162)**：详情/看板编辑仍走 `updateTask`（SQLite→Y.Doc）；入站 `task_crdt` / 离线 batch 经 `mirrorCrdtDocIntoSqlite` 回写标题描述等字段，UI 可刷新。
- **task_crdt 离线补拉 (TASK-161)**：`task_crdt_sync_request` / `_batch`（state vector）；`taskCrdtOfflineSyncService`；`verify:task-crdt`。
- **task_crdt 双写共存 (TASK-160)**：`taskService` 写后 `mirrorTaskToCrdt`；入站 `task_patch` `mirrorTaskPatchIntoCrdt`（不回环 publish）；约定 SQLite 先、Y.Doc 后。
- **task_crdt 实时帧 (TASK-159)**：`taskCrdtService` publish/apply；挂入 `taskSyncService` 订阅；`verify:task-crdt-realtime`。
- **群级 Y.Doc 持久化 (TASK-158)**：表 `task_crdt_docs`（schema v4）；`taskCrdtStore` 从 `tasks` seed / blob 加载；`verify:task-crdt-store`。
- **task_crdt 协议解禁 (TASK-157)**：`TaskCrdtPayload` / `isTaskCrdtPayload`（`shared/task/taskCrdt.ts`）；从 `UNIMPLEMENTED_SYNC_TYPES` 移除 `task_crdt`；`docs/03` §6.2/§10 与 `verify:sync-handlers` 对齐。
- **引入 Yjs 依赖 (TASK-156)**：安装 `yjs@^13`；`verify:rc-reality` 改为要求 `yjs`、仍禁止 WebRTC；`docs/01` §1.3.1 标明 Yjs 已引入、`task_crdt` 落地中（目标 v1.1.0）。

### Release
- `v1.1.0` — Yjs `task_crdt`：群级 Y.Doc 持久化、实时帧、双写共存、state-vector 离线补拉与详情回写闭环（TASK-156–163）

## [1.0.7] - 2026-07-11

### Added
- **SPRINT-READ-RECEIPT-OFFLINE 收尾 (TASK-155)**：docs/06 §2.3 / README 对齐已读离线补拉；Sprint VERIFY 绿；归档 `20260711_011901_read_receipt_offline_summary.md`。
- **已读离线补拉验收 (TASK-154)**：`verify:read-receipt-offline` 双 stub（B 发消息 → A 已读 → B 补拉见双勾）。
- **已读离线补拉服务 (TASK-153)**：重连 `read_receipt_sync_request`；对端 batch；入站 upsert + 刷新双勾；挂到 `initChatService`。
- **已读离线补拉仓储 (TASK-152)**：`listReadReceiptsSince` / `getMaxReadAtInGroup`（since/min + LIMIT）。
- **已读离线补拉协议 (TASK-151)**：`read_receipt_sync_request` / `read_receipt_sync_batch` + payload 校验；`docs/03` 对齐；`verify:sync-handlers` 登记。

### Release
- `v1.0.7` — 已读回执 7 天离线补拉

## [1.0.6] - 2026-07-11

### Fixed
- **头像实际可见**：TopBar / 个人资料 / 聊天气泡 / 成员列表 / 成员资料弹窗统一消费 `avatarUrl`；修复历史 SVG `;utf8` data URL 无法加载；缺省用按 userId 确定性色块兜底。

### Added
- **SPRINT-DISTRIBUTED-SEMANTICS 收尾 (TASK-150)**：`docs/06` §2.3 对齐 `member_event` dissolve / 撤回 `json_extract`；Sprint VERIFY 绿；归档 `20260711_010721_distributed_semantics_summary.md`。
- **撤回结构化查询 (TASK-149)**：`listRecalledMessagesInGroup` 改用 `json_extract`（兼容 content 包裹/顶层 kind），避免 `LIKE` 假阳性；offline-sync 集成覆盖。
- **解散 peer 通知 (TASK-147)**：dissolve 先 publish `member_event` 再本地清群；对端 handler 清群 + toast（`group.dissolvedRemotely`）；`verify:member-event` 双 stub 冒烟。
- **member_event 协议解禁 (TASK-146)**：`MemberEventPayload`；从 `UNIMPLEMENTED_SYNC_TYPES` 移除 `member_event`（仅余 `task_crdt`）；`docs/03` / `verify:sync-handlers` 对齐。
- **SPRINT-SYNC-RELIABILITY 收尾 (TASK-145)**：Sprint VERIFY 绿；归档 `20260711_005222_sync_reliability_summary.md`。
- **聊天建任务失败补偿 (TASK-144)**：`createTaskFromChat` 在消息 publish 失败时软删任务并撤回本地消息，保持消息/任务一致。
- **LWW 平局决胜 (TASK-143)**：`updatedAt` 相等时用 `senderDeviceId` 字典序决胜；SQLite `last_writer_device_id`（schema v3）；`lwwShouldApply` 单测 + sync/dep 集成覆盖。
- **任务/文件同步失败可观测 (TASK-142)**：去掉静默 `.catch`；主进程打日志；用户侧 publish 失败 toast（`app:userNotice`）；预期离线早退不误报。
- **聊天发送失败可重试 (TASK-141)**：publish 失败标记 `failed`；有限次自动重试（退避）；气泡「重试」+ `chat:retryMessage` IPC。
- **群置顶与活跃排序 (TASK-139)**：本机置顶（localStorage）；下拉按置顶优先、其余按最后消息时间降序；`group:listLastActivity` 聚合查询。
- **SPRINT-GROUP-SWITCHER 收尾 (TASK-140)**：Sprint VERIFY 绿；README 顶栏群切换能力一句化；归档 `20260711_003600_group_switcher_summary.md`。

### Release
- `v1.0.6` — 同步可靠性 · 解散 peer 通知 · 头像可见 · 群置顶/活跃排序

## [1.0.5] - 2026-07-11

### Changed
- **聊天页去重群名 (TASK-137)**：群名 / DM 名仅保留在 TopBar 切换器；聊天页不再渲染重复的 `ViewHeader` 大标题；Select 与 Logo 对齐字阶与高度；`docs/04` §1.4 同步。

### Added
- **群切换器拼音搜索 (TASK-138)**：TopBar 群下拉支持汉字子串与拼音全拼/首字母过滤（`pinyin-pro`）；空查询展示全量列表。
- **聊天引用任务 (#)**：输入 `#` 弹出任务建议；`chat:sendTaskRef` / `task:referenceFromChat`；气泡可点击跳转看板。
- **任务离线补拉 (TASK-134)**：`task_sync_request` / `task_sync_batch`；按 `updatedAt` 合并分页拉取任务与依赖（含软删）；`verify:task-offline-sync`。
- **同步文档对齐 (TASK-135)**：`docs/03` 补 `task_sync_*` / `chat_sync_*` payload 与 §12 补拉/历史分页；`docs/06` §2.3 更新任务/聊天同步现状。
- **SPRINT-SYNC-CONSISTENCY 收尾 (TASK-136)**：全量 verify 绿；README 同步能力一句化；归档 `20260711_002128_sync_consistency_summary.md`。
- **聊天历史分页 (TASK-133)**：初始加载最近 200 条；`chat:loadOlderMessages` + 上滑续载；`ChatMessagePage.hasMore`；修复 ASC+LIMIT 只见最早消息的问题；补齐 `sendTaskRefMessage`（TASK-131 遗留未导出）。
- **聊天离线补同步分页续传 (TASK-132)**：`chat_sync_batch.hasMore`；响应方按 100 条分页循环推送；请求方跟进下一页；`splitOfflineSyncPage` / `verify:offline-sync-integration` 覆盖 >100 条。
- **task_dep_patch P2P 同步 (TASK-131)**：依赖边 upsert/delete 经 `task_dep_patch` 广播；SQLite `task_dependencies` 增 `updated_at`/`deleted_at`（schema v2）；远端 LWW 合并；`verify:task-dep-sync`。
- **task_dep_patch 协议 (TASK-130)**：`SyncMessageType` 新增 `task_dep_patch`；`TaskDepPatchPayload` / `isTaskDepPatchPayload`（`shared/task/sync.ts`）；`docs/03` §6.2 payload 草案；`verify:task-dep-protocol`。

### Fixed
- **发版门禁对齐**：`docs/04` / `verify-visual` 接受 `--lanpm-canvas-inset`；补齐缺失 CSS 令牌；`verify-project` 跳过 `[Unreleased]` 比对版本。

### Release
- `v1.0.5` — 分布式同步一致性 · 聊天 `#` 引用任务 · TopBar 群名去重

## [1.0.4] - 2026-07-10

### Added
- **Elevation 物理层级设计令牌 (TASK-124)**：新增 `--lanpm-shadow-surface`、`--lanpm-shadow-card`、`--lanpm-canvas-inset` 全局令牌；`UI优化.md` 补充布局接缝「不圆角」例外规范与 Canvas/Surface/Card 分层指引。
- **聊天页 Canvas/Surface 三层分层 (TASK-125)**：消息滚动区退至 `--lanpm-bg` 画布层；附件卡片升级 `--lanpm-shadow-card` 双层投影；侧栏/模式条/输入区保持 Surface 白底。
- **看板列容器与任务卡片层级 (TASK-126)**：列体 `--lanpm-shadow-surface` 浮于画布；列内 `--lanpm-bg` 槽位；任务卡白底 `--lanpm-shadow-card` 与列体分离。
- **文件页与任务树 Surface 分层 (TASK-127)**：文件列表区 Canvas、预览区 Surface；任务树/详情面板 `--lanpm-shadow-surface` 浮起。
- **MainLayout 画布槽位与工具条层级 (TASK-128)**：`--lanpm-canvas-inset` 替换硬编码 16px；ViewToolbar 升级为 Surface 浮条。
- **顶栏、公共组件与全局搜索圆角大一统 (TASK-122)**：应用 `--lanpm-radius-md` (10px) 全面重构顶栏的项目选择、搜索框、全局搜索框（GlobalSearch），并与 ViewSegment 分类选择器滑块和 RegionButton 等公共核心组件建立几何严密契合的嵌套映射，扫除全站最后一处魔法圆角数值。
- **看板容器与卡片几何同心圆角嵌套 (TASK-121)**：将看板列容器（.column）圆角升级至 `--lanpm-radius-lg` (14px)，与内部卡片的 `--lanpm-radius-md` (10px) 形成同心嵌套圆角比例，满足完美的物理容纳几何美感。
- **聊天与文件板块几何圆角一统 (TASK-120)**：全面应用 `--lanpm-radius-md` (10px) 和 `--lanpm-radius-sm` (6px) 规范重构聊天流气泡、表情选择器和文件传输面板，实现物理层级圆角的优雅收拢。
- **输入框焦点呼吸淡化 (TASK-112)**：移除输入框获得焦点时的硬生边框，升级为基于 `--lanpm-accent-ring` 的微光平滑呼吸晕染。
- **侧边栏状态降噪与清理 (TASK-113)**：清除 MemberList 底部重复冗余的在线统计，并柔和化 chatContextMeta 辅助文字，实现完美减负。
- **延期卡片消噪与视觉回归 (TASK-114)**：去除原本粗暴的“通体大红、大黄描边”视觉过载，重新运用柔化语义令牌搭配 desaturated 极低饱和度背景，将视觉重心归还给左侧的任务族彩色条。
- **任务树进度条 Capsule 药丸化 (TASK-115)**：深度定制 Ant Progress，全量穿透重绘为 5px macOS 风格圆角药丸状细长条，内置语义主题色，细腻优雅。
- **看板工具栏图例完美圆点化 (TASK-116)**：将图例多色大方块缩拢精简为极窄的圆点状态，并重构间距，使宽屏状态极具空灵美感。
- **文件传输面板智能折叠 (TASK-117)**：在无活跃文件传输时，面板自动缩起成精巧长条，在传输发生时则呼吸式柔和展显，归还 90% 视图呼吸空间。
- **文件右侧预览空白空态重绘 (TASK-118)**：彻底告别硬左对齐大字，重塑为基于圆环线型图标、居中微缩元数据解释的设计流，极富高级产品气质。

### Tag
- `v1.0.4` — 画布退后与卡片感层级 · 圆角令牌大一统 · 极致 UI 抛光

## [1.0.3] - 2026-07-10

### Added
- **设计动效与色彩令牌落地 (TASK-104)**：引入 `--lanpm-motion-fast` (150ms) / `normal` 缓动；将主强调色优化为 Apple 深石板蓝 (#0066cc)，亮暗边框发丝线由 stark 变为克制的高级质感。
- **卡片化附件与己方气泡柔和质感 (TASK-105)**：彻底告别饱和蓝气泡，改为浅底蓝字微描边高级质感；附件(文件、任务引用)完全卡片化，支持 hover translation 和阴影反馈。
- **极简一体化输入框与图标发送 (TASK-106)**：收束输入区提示，整合输入框为圆角胶囊 (.inputWrap)，搭配 hover 微边框 and focus 发光，使用带有弹簧物理触感的圆形 icon 发送按钮。
- **高密度 MemberList 与微过渡 (TASK-107)**：设置 38px 侧栏行高实现紧凑有序的高级感；利用 Apple cubic-bezier 在整行 hover 时执行微过渡。
- **顶栏一区一主操作收拢 (TASK-108)**：宽屏下的“发现”、“创建”和“解散”全部收拢到“更多”下拉菜单中，Logo hover 支持柔和偏转。
- **iOS 风格 BottomNav / RegionalTab 选中与 active 弹簧触感 (TASK-109)**：选中增加 icon 缩放，按压时注入 0.96x/0.97x 弹簧微缩，模拟真实触感。
- **docs/04 视觉磨砂同步 (TASK-110)**：将色、动、样式的打磨标准完全同步写入交互与 UI 约定。

### Tag
- `v1.0.3` — 视觉动效与色彩令牌落地 · 己方气泡柔底描边 · 输入与按压反馈 · 顶栏降噪

## [1.0.2] - 2026-07-10

### Changed
- **看板常驻 FS 连线（P4）**：工具栏开关默认关，开启后绘制全板浅灰 FS 边，悬停/固定高亮仍加强黄/强调色；`listAllDependencyEdges` · `docs/04`（`SPRINT-BOARD-DEPS-FULL`）
- **顶栏 IA（P4）**：主题/语言移入用户菜单；驾驶舱收入「更多」；驾驶舱路由时 Logo 显示返回当前群语义；`docs/04` §1 顶底职责（`SPRINT-IA-SHELL`）
- **文件页窄屏预览（P3）**：≤960 预览改底部 Drawer（宽屏双栏不变）；预览内容复用；`docs/04` 响应式表与 §6.4（`SPRINT-FILES-RESPONSIVE`）
- **文件列表书签行级区分（P2）**：「全部」混排时书签行图标+Tag+浅底；类型/预览/操作列收敛；`docs/04` §6.4（`SPRINT-FILES-BOOKMARK-UX`）
- **文件页抛光（P1）**：工具栏以上传为主 CTA；书签导入/导出收入「更多」；限速移入传输面板；书签预览主次（外开为主、内嵌降级）；空态分场景文案与引导；`docs/04` §6.4（`SPRINT-FILES-P1`）

### Added
- **看板 FS 依赖连线**：悬停/固定高亮关联卡时，SVG 叠加层绘制前置/后继 FS 连线（`listFocusDependencyEdges` · `BoardDependencyLines`）；工具栏图例补充连线色说明（`SPRINT-BOARD-DEPS`）

### Tag
- `v1.0.2` — 文件页抛光 · 顶栏 IA · 看板 FS 连线（悬停 + 可开关全图）

## [1.0.1] - 2026-07-09

### Changed
- **磁盘卫生**：集成测试临时目录改仓库 `.lanpm/tmp/`（测完删除）；Stub 总线默认 `.lanpm/stub-bus/`；截图暂存改 `userData/tmp`；`docs/05` 路径约定（避免堆满 `/tmp`）
- **磁盘约定落地**：双实例手验改 `.lanpm/dev-a|b`；`onekey_run` clean 清 coverage/`.lanpm` 可重建项与 `/tmp/lanpm*`，`clean deep` 另清 Electron 工具链缓存（不碰 `~/.config/lanpm`）
- **归档统一**：根目录 `archive/` 全部迁入 `.cursorGrowth/archive/`（gitignore）；打包排除 `.cursorGrowth/**`
- **文档边界**：`docs/` 与入库测试不再链接/依赖 archive 内文件；`verify:docs-code` 可选日志改写 `.cursorGrowth/logs/`；`docs/00` 明示禁止引用归档；`eslint` ignore 改为 `.cursorGrowth`

### Tag
- `v1.0.1` — 磁盘/归档治理 patch

## [1.0.0] - 2026-07-09

### Changed
- **正式版 `1.0.0`**：`package.json` / README 中英 badge·正文 / `docs/00`·`01`·`02`·`06` 版本指针自 `1.0.0-rc.81` 升至 `1.0.0`（`TASK-061`）
- **验收 SSOT**：`docs/06` §2.6「发布 1.0.0」勾选；真机 UI / 真网双机 / 冷启动内存 / 英文折行肉眼仍延期并**显式接受风险**（`TASK-062`）

### Added（自 rc.81 审阅跟进，随正式版一并交付）
- SQLite 增量 migration 骨架；AI Key / WebView 安全加固；协议空转 `publish` 守卫；ACC 自动化闭合；浏览器桩假成功修复；执行面板仅 `.cursorGrowth/plan.md`

### Tag
- `v1.0.0` — 正式版

## [1.0.0-rc.81] - 2026-05-30

### Added
- **代码文档审计**：完善 `archive/audit/docs-code/` 归档，记录 DOC-PRD/DOC-TECH/DOC-ACC/DOC-VIS/DOC-F 系列审计结论
- **Blockmap 说明**：`.blockmap` 文件用于 electron-builder 差量更新，必须随安装包发布

### Changed
- **文档修正**：`docs/05_测试与联调发布.md` 更新部分描述
- **版本门面对齐**：README 中英 badge/正文、`docs/01` §1.3.1、`docs/02` RC 说明与 `package.json` 一致为 `1.0.0-rc.81`（`TASK-001`）
- **验收文档**：`docs/06` 标明 RC `1.0.0-rc.81`；§2.3 补充匿名群内存会话边界；`docs/00` 增加 RC 对外表述与 `.cursorGrowth/plan.md` 指针（`TASK-002`）
- **根 plan.md**：改为历史备忘，执行面板指向 `.cursorGrowth/plan.md`（`TASK-006`）

### Fixed
- **主进程 broadcast 导入路径**：`taskService` / `fileService` 改为 `../utils/broadcast`，修复 `electron-vite build` 无法解析模块（`TASK-001` 验收阻断）

### Added
- **SQLite 增量 migration 骨架**：`applyMigrations`（v0 全量 DDL · v≥1 步进 · 版本过高抛错）；`verify:storage` 覆盖 bootstrap/幂等/拒新版本（`SPIKE-SCHEMA-01` · `TASK-010` · `TASK-011`）
- **安全加固**：正式版禁止 AI Key `dev:` 回退加密（须 OS safeStorage）；书签 WebView 仅 http(s) 导航 + 主进程 `will-attach-webview` 守卫；`verify:sec-hardening`（`TASK-020` · `TASK-021`）
- **协议空转守卫**：`task_crdt` / `member_event` 由 `UNIMPLEMENTED_SYNC_TYPES` 在 Stub/Real `publish` 拒绝发送；文档 §2.3 / `03` 同步（`TASK-030` · `TASK-031`）
- **ACC 自动化闭合**：`docs/06` §2.5/§2.6 以 CI 三平台 `verify:m7`、`verify:dual-stub`、`verify:m7-perf`、`verify:i18n-en` 闭合可证层；真机 UI / 真网双机 / 冷启动内存 / 英文折行肉眼标延期；`1.0.0` 延至 `SPRINT-1.0-GATE`（`TASK-041`–`TASK-045`）
- **浏览器桩假成功修复**：书签持久化、`connectManualPeer`/`importGroupBundle` 拒绝误导成功、`clearGroupMessages` 真清、`saveAiConfig` 校验 Key；`verify:stub-behavior` 入 `verify:p0`（`SPIKE-STUB-01` · `TASK-050`）
- **执行面板单一来源**：删除根目录 `plan.md`；Sprint/TASK 仅 `.cursorGrowth/plan.md`；看板跨列依赖 backlog 迁入候选 `SPRINT-BOARD-DEPS`；`docs/00` 同步

### Tag
- `v1.0.0-rc.81` — 代码文档审计 + Blockmap 说明

## [1.0.0-rc.80] - 2026-05-30

### Added
- **Linux `.deb`**：`electron-builder.yml` + CI 上传/发布
- **CI 全自动 Release**：`target_commitish` 绑定构建 commit · Publish 后 `ensure-release-tag.sh` 补打 git tag
- **workflow_dispatch `ref`**：默认从 `master` 构建（含最新 CI 脚本），**勿先 push tag**

### Changed
- **B 档发布二进制**：推荐 Actions → Run workflow（tag + ref=master），无需手点 Publish

### Tag
- `v1.0.0-rc.80` — Linux deb + CI 全自动发布

## [1.0.0-rc.79] - 2026-05-30

### Added
- **LICENSE**：GNU **AGPL-3.0-or-later** 全文（`Copyright (C) 2026 LanPM contributors`）

### Changed
- **package.json**：声明 `license: AGPL-3.0-or-later`
- **CI workflows**：`verify` / `release` / `sync-r2` 审查加固（REST API 发布 draft、tag 解析脚本、`publish_only` dispatch、排除 debug 产物）

### Tag
- `v1.0.0-rc.79` — AGPL-3.0 许可证 + CI workflow 加固

## [1.0.0-rc.78] - 2026-05-30

### Fixed
- **CI Release（Immutable Releases）**：`release.yml` 先 `draft: true` 上传资产，再用 `gh release edit` 发布；修复 prerelease 在 immutable 仓库上「先 publish 后 upload」失败
- **CI Release**：新增 `workflow_dispatch`，可指定 tag 重跑发布（如修复 `v1.0.0-rc.77` 半成品 Release）

### Tag
- `v1.0.0-rc.78` — 修复 GitHub Release immutable 上传顺序

## [1.0.0-rc.77] - 2026-05-30

### Added
- **CI 发布**：`.github/workflows/release.yml` — push `v*` 标签触发三平台 Electron 安装包 → GitHub Release
- **CI R2 同步（可选）**：`.github/workflows/sync-r2.yml` — Release 成功后同步至 Cloudflare R2 独立下载页
- **R2 下载页生成**：`.github/scripts/generate-r2-download-index.py`
- **发版两档 SSOT**：`.cursor/rules/lanpm-release.mdc` + `.cursor/skills/lanpm-release/SKILL.md`（A 打版 / B 发布二进制）

### Changed
- **Cursor 发版文档**：`lanpm-visual-audit`、`lanpm-docs-code-audit`、`release-visual-gate`、`renderer-visual-tokens` 对齐 A/B 两档模型
- **`docs/05`**：补充 `verify.yml` / `release.yml` / `sync-r2.yml` 触发说明

### Tag
- `v1.0.0-rc.77` — CI 三平台发布 + R2 可选同步 + 发版两档 SSOT

## [1.0.0-rc.76] - 2026-05-30

### Fixed
- **CI `verify:m7` / Vitest**：`boardRelations`、`scheduleHealth`、`scheduleHealthGantt` 单测改为 `describe`/`it`（消除 `No test suite found`）
- **Node `--experimental-strip-types`**：`taskRepository` 引入 `validation.ts`；`ganttAdapter` / `taskFamilyColors` 链式 import 补 `.ts` 后缀（修复 `task-sync`、`verify:m4` ESM 解析）
- **`tsconfig.web.json`**：启用 `allowImportingTsExtensions`，与 node 侧及静态 verify 脚本一致

### Added
- **README**：中英双语产品页（截图、特性表、快速开始）；`README.zh-CN.md`；`assets/` 产品截图（聊天/看板/甘特/任务树/文件/导出）

### Changed
- **`visualCapture`**：种子任务等待延长至 35s、匹配 `cardTitle` 节点、广播后 1.5s 缓冲，提升 CI 截图稳定性

### Tag
- `v1.0.0-rc.76` — CI 单测与 ESM 回归修复 + README 产品页

## [1.0.0-rc.75] - 2026-05-29

### Fixed
- **CI typecheck**：`useLocateTask` 从 `@shared/navigation/types` 导入 `AppView`；甘特条样式合并进 `scheduleHealth.ts`（避免 `.ts` 扩展名与 Node 单测冲突）

### Added
- **工期健康度（三视图统一）**：`scheduleHealth.ts` — 绿 `on_track` / 深黄 `behind` / 纯红 `overdue`；`scheduleHealthUi.ts` + `scheduleHealth.module.css`
- **看板**：卡片工期色、截止/进度字色、图例（绿·黄·红）；**任务树**：行左缘色条 + 进度条；**甘特**：条进度色合并族色；tooltip 期望/当前 %
- **任务详情**：落后/延期 `Alert`（期望 vs 当前进度）
- **单测**：`scheduleHealth.test.ts`、`scheduleHealthGantt.test.ts`

### Changed
- **驾驶舱**：`delayedCount` / 项目 `risk` 与看板同源（`getTaskScheduleHealth`），不再用「进度&lt;40%」启发式
- **任务校验**：`taskService` / `taskRepository` 统一标题规范化、日期范围、`clampProgressPercent`；看板/树/聊天创建表单对齐 `validateTaskForm`
- **docs/04**：§6.0 工期健康度表（四态语义与各视图表现）

### Tag
- `v1.0.0-rc.75` — 工期健康度三视图一致

## [1.0.0-rc.74] - 2026-05-29

### Fixed
- **看板图例 i18n**：合并为 `board.legendToolbar` 单条文案，避免显示原始 key；`translate` 对非法 locale 回退

### Added
- **表单快捷键**：`inputKeyboard`；任务/群组/配置/文件书签/数据保留等支持 Enter / Ctrl+Enter 提交
- **全局搜索**：Enter 打开首条结果（带 `highlightTaskId` 跳转看板/树/甘特）
- **看板**：任务族色条图例；卡片菜单「在任务树 / 甘特中定位」；`useLocateTask` 统一跨视图跳转
- **甘特**：`highlightTaskId` 行滚动定位；tooltip 展示前置/后继任务标题

### Changed
- **看板拖列**：FS/SS/FF/SF 依赖规则（`getDependencyBlockersForStatus`）；卡片等待标签覆盖全部阻塞类型

### Tag
- `v1.0.0-rc.74` — 多视图关系体验补全

## [1.0.0-rc.73] - 2026-05-29

### Added
- **任务族视觉 SSOT**：`taskFamilyColors.ts` + `taskFamily.module.css`；看板 / 任务树 / 甘特条共用 8 色
- **任务树详情**：前置 / 后继列表、父任务面包屑、「在看板 / 甘特中定位」
- **跨视图定位**：`highlightTaskId` 进入看板时自动固定关联高亮

### Changed
- **甘特条**：有关联任务使用族色（里程碑仍为琥珀色）
- **docs/04**：三视图关系与配色说明

### Tag
- `v1.0.0-rc.73` — 多视图任务关系视觉一致

## [1.0.0-rc.72] - 2026-05-29

### Added
- **看板任务关系**：族色条、父/子/同级与 FS 依赖标签；悬停或菜单「固定高亮」关联卡；拖入进行中/已完成时校验 FS 前置
- **`shared/task/boardRelations.ts`** + 单测 `tests/unit/task/boardRelations.test.ts`

### Changed
- **docs/04**：看板与树/甘特多视角关系说明

### Tag
- `v1.0.0-rc.72` — 看板关系可视化与 FS 约束

## [1.0.0-rc.71] - 2026-05-29

### Changed
- **任务树工具栏**：`ViewToolbarPair` 根/子任务「输入 + 按钮」成对分组，避免 flex 换行时「添加子任务」与输入框分离；子任务支持 Enter 创建

### Tag
- `v1.0.0-rc.71` — 任务树工具栏成对布局

## [1.0.0-rc.70] - 2026-05-29

### Changed
- **看板**：展示群组内**全部任务**（含子任务），列内平铺，不按 `parentTaskId` 过滤；父子层级仅在任务树维护
- **看板 Tab 角标**：待办数统计全部 `status=todo` 任务（与平铺展示一致）
- **docs/03、04、05**：看板范围说明同步

### Tag
- `v1.0.0-rc.70` — 看板全任务平铺

## [1.0.0-rc.69] - 2026-05-29

### Changed
- **看板**：「新建任务」入口移至 **待办列标头** `+` 按钮；工具栏仅保留操作提示；空看板仍展示四列以便从标头创建

### Tag
- `v1.0.0-rc.69` — 看板待办列标头新建入口

## [1.0.0-rc.68] - 2026-05-29

### Changed
- **跨平台字体**：`--lanpm-font-family` SSOT；macOS 用 `-apple-system`（SF）+ 苹方，Windows/Linux 系统回退；**不捆绑** SF Pro 字体文件
- **docs/04** §1.5.1：字体族与平台说明
- **ThemeProvider**：与 `global.module.css` 字体栈对齐

### Tag
- `v1.0.0-rc.68` — 跨平台系统字体栈（Apple 平台自动 SF/苹方）

## [1.0.0-rc.67] - 2026-05-29

### Added
- **`ComposerIconButton`**：聊天输入区工具栏统一图标按钮

### Changed
- **聊天 composer**：工具栏 Ant `text` → `ComposerIconButton`；顶/内分隔改为 `0.5px` `--lanpm-separator`；发送钮圆角与字号收敛
- **代码块复制**：`caption` 样式
- **ThemeProvider**：Ant 默认/文字按钮透明底，贴近 macOS 工具栏

### Tag
- `v1.0.0-rc.67` — 聊天输入区 Apple 化

## [1.0.0-rc.66] - 2026-05-29

### Added
- **`RegionButton` `caption`**：行内小号强调链接（替代 Ant `type="link"`）

### Changed
- **文件预览**：「分享到聊天」改为默认按钮；传输续传用语义链接样式
- **代码块 / 驾驶舱报表**：展开折叠改用 `caption`
- **看板/树/甘特**：面板边框 `0.5px` `--lanpm-separator`（补交 rc.65 未提交部分）
- **文档版本号**：README、`docs/01` §1.3.1、`docs/02` RC 说明与 `package.json` 对齐

### Tag
- `v1.0.0-rc.66` — 内联链接与次要按钮 Apple 化

## [1.0.0-rc.65] - 2026-05-29

### Changed
- **`RegionTabBar`**：对齐 BottomNav（发丝底边、选中仅强调色；无竖线/顶条/蓝底）
- **聊天上下文 / 成员资料 / 甘特排期**：`type="link"` / `pill` → `RegionButton` `toolbar`
- **`ViewHeader`**：任务视图无底部分隔；聊天页 `showDivider` 发丝线
- **内容面板**：文件列表/预览单卡片 + inset 分隔；看板/树/甘特边框 `0.5px` `--lanpm-separator`
- **docs/04** §1.4 / §1.6；**`verify:visual`** 增加 `RegionTabBar` 守卫

### Tag
- `v1.0.0-rc.65` — Apple HIG 全应用 Tab/面板/捷径统一

## [1.0.0-rc.64] - 2026-05-29

### Added
- **`ViewCrossLink`**：跨视图 pill 捷径（看板↔树、甘特→看板）
- **聊天上下文**：项目群「看板」快捷入口
- **职能群**：聊天页可关闭说明横幅；BottomNav 禁用 Tab 显示锁图标
- **窄屏 TopBar**：发现/创建/解散收入「更多」；搜索图标 + Popover
- **全局搜索**：结果标注目标视图（`search.openInView`）

### Changed
- **Apple HIG 收敛**：BottomNav iOS Tab Bar；`ViewSegment` 分段浮起；顶栏 `toolbar` 文字按钮；`ViewHeader` 大标题；区域 hover 去描边环
- **匿名群 BottomNav**：仅渲染聊天 Tab
- **主视图导航**：五 Tab 仅保留 BottomNav，避免与工具栏重复分段
- **docs/04** §2：导航 SSOT 补充

### Tag
- `v1.0.0-rc.64` — 协作导航迭代（工具栏分段 + 窄屏顶栏 + 搜索目标视图）

## [1.0.0-rc.63] - 2026-05-29

### Added
- **驾驶舱返回项目**：TopBar / CockpitView「返回 {群名}」；`cockpitReturnPath` 恢复当前群上次视图
- **i18n**：`cockpit.backToProject`（zh/en）

### Changed
- **根目录备忘迁出**：删除 `设计微调.md`、`微信借鉴.md`；全文仅保留于 `archive/plan/20260529_230349_*`、`20260529_224315_*`
- **plan.md**：仅链至 `archive/plan/`，手验 SSOT 仍为 docs/06 §2.6

### Tag
- `v1.0.0-rc.63` — 驾驶舱返回项目、设计备忘移入 archive

## [1.0.0-rc.62] - 2026-05-29

### Changed
- **设计微调 P0 落地**：聊天侧栏/模式条/上下文栏/输入区 `--lanpm-surface-solid`；亮色 `--lanpm-border` / `--lanpm-bar-border` 加强；`TopBar` 组间竖分隔；`ViewHeader` 底部分隔线；文件传输列表铺底
- **设计微调.md**：P0/P1 待办勾选、全页范围与手验矩阵（DM-14/15 留 dev 人工）
- **docs/04** §1.5 / §6.1：聊天面色差与 `bar-border` 说明

### Tag
- `v1.0.0-rc.62` — 设计微调 P0 视觉层次落地

## [1.0.0-rc.61] - 2026-05-29

### Added
- **i18n 错误码体系**：`shared/errors/lanpmError`（`throwLanpm` / `isLanpmErrorCode`）；主进程用户可见错误统一为 key；Renderer `formatAppError` + `useI18n().formatError`
- **err.* / member.***：36 条业务错误与访客展示文案（zh-CN / en-US，共 545 key）
- **任务树详情栏**：右侧常驻详情区（对齐文件预览）；默认选中首个根任务；`tree.selectToViewDetail`
- **设计微调.md**：亮/暗视觉层次与分界备忘（聊天侧栏、顶栏、令牌）

### Changed
- **访客 / 私聊占位**：`LANPM_GUEST_DISPLAY`、`LANPM_DM_GROUP_LABEL`；`memberDisplay` / `groupLabels` 展示层解析
- **Renderer**：各页 `message.error` 改用 `formatError`；`verify:i18n-keys` 扫描 `throwLanpm` 与 `throw new Error('key')`
- **verify:visual**：校验 CSS 中 `var(--lanpm-*)` 须在 `global.module.css` 定义
- **聊天**：成员列表标题按钮 `--lanpm-text` 令牌修正
- **plan.md / 微信借鉴.md**：rc.54–rc.60 与 WX 全文迁入 `archive/plan/20260529_224315_*`；根目录仅保留手验索引

### Tag
- `v1.0.0-rc.61` — 全栈 i18n 错误码、任务树详情栏、视觉备忘

## [1.0.0-rc.60] - 2026-05-29

### Added
- **WX-04b 消息撤回**：右键自己的消息撤回；`chat:recallMessage` IPC + `chat_recall` 网络同步；离线补同步含已撤回消息
- **shared/chat/recall**：撤回规则、`recalled` 内容类型；单测 `recall.test.ts`

### Changed
- **甘特导出**：PNG/PDF 导出按任务行数裁剪画布，避免空白过长（`ganttExport` / `GanttView`）
- **plan.md / 微信借鉴.md**：WX-04b 完成态同步

### Tag
- `v1.0.0-rc.60` — 消息撤回与甘特导出裁剪

## [1.0.0-rc.59] - 2026-05-29

### Added
- **WX-01～06 聊天体验**：新消息跳转条、DM 最后消息预览、群聊上下文栏、系统消息弱样式、桌面通知偏好（`useChatNotifications` / `notificationPrefsStore`）
- **shared/chat**：`messagePreview`、`scrollPin`、`notificationPreferences`；单测 `messagePreview`、`useNewMessageScroll`
- **甘特图**：导出增强（`ganttExport` / 日历标签 `ganttCalendarLabels` / `ganttTimeline`）

### Changed
- **根目录文档迁出**：`todo.md` → `archive/todo/20260529_223000_*`；`数据.md` → `archive/audit/20260529_223000_*`；手验 SSOT → `docs/06` §2.6
- **聊天滚动**：仅贴底或自己发送时自动滚底；`useMentionNotifications` 合并为 `useChatNotifications`
- **主进程**：移除 `chatService` 重复 @ 桌面通知
- **plan.md / 微信借鉴.md**：WX 对照表与待办同步

### Tag
- `v1.0.0-rc.59` — 微信借鉴聊天增强、根目录 SSOT 迁入 docs/06、甘特导出

## [1.0.0-rc.58] - 2026-05-29

### Added
- **聊天成员资料**：`MemberProfileModal`（用户 ID、在线态、@提及、发起私聊）
- **消息气泡**：发送者头像/菜单（查看资料、@提及、私聊）；气泡与附件样式增强

### Changed
- **todo.md**：非手验项归档至 `archive/todo/20260529_221500_todo非手验项全量归档_rc57.md`，仅保留 §手验
- **文档**：README、`docs/01` §1.3.1、`docs/02` RC 号与 `package.json` 对齐（`verify:docs-code --strict`）
- **i18n**：`chat.memberProfile*` / `mentionMember` / `viewMemberProfile`（zh/en）
- **DmSessionBar**：`resolveGroupDisplayNameById` 兜底，修复 typecheck
- **eslint**：忽略 `coverage/`，避免覆盖率报告触发 lint

### Tag
- `v1.0.0-rc.58` — 成员资料弹窗、todo 归档、发版门禁收尾

## [1.0.0-rc.57] - 2026-05-29

### Added
- **解散群组**：仅群主、非 DM；`group:dissolve` IPC + `deleteGroupCascade`；解散时清理群密钥、匿名会话与磁盘文件副本
- **TopBar**：当前群「解散群组」确认对话框（i18n zh/en）
- **Mock 目录 v2**：`mockCatalog` / `seedMockData` 注入演示任务、聊天、书签与虚拟成员；`MOCK_CATALOG_VERSION` 可重播升级
- **单元测试扩面**：`tests/unit` 增至 152 项（app/data/ipc/search/presence/identity/group/mock 等）

### Changed
- 演示群种子从 `groupService` 内联迁至 `src/main/mock/` + `shared/group/mock.ts`
- **`browserLanpmStub`**：对齐 `dissolve` 与 mock 群列表行为

### Tag
- `v1.0.0-rc.57` — 解散群组、Mock v2、单元测试扩面

## [1.0.0-rc.56] - 2026-05-29

### Added
- **DATA-SCHEMA-FK**：`referentialCleanup` + `verify:schema-fk`（孤儿依赖/传输清理）
- **Bundle 设置 UI**：个人设置 → 数据与存储 · 加密导出/导入向导（含口令、含文件本体、冲突模式）
- **文件页**：本机移除副本、传输队列「本地队列」标签

### Changed
- **V-14b-HOV**：`ViewSegment` / `RegionButton` hover 加强；`verify:visual` 断言
- **文档**：删除 `docs/08_post-RC`；post-RC / 已知限制并入 `docs/06` §2.3、§6；`docs/03` §12、`数据.md` 同步
- **docs/06 §2.5**：DOC-02 自动化项勾选

### Tag
- `v1.0.0-rc.56` — SCHEMA-FK、Bundle UI、V-14b-HOV、文档 01–06

## [1.0.0-rc.55] - 2026-05-29

### Added
- **个人设置 · 数据与存储**：保留天数、占用、立即清理、单群清空（`DataStoragePanel` + `data:*` IPC）
- **删父任务确认**：无默认项，级联删除 / 子任务上浮（看板、任务树）
- **单群加密备份**：`bundleService` + `data:exportGroupBundle` / `importGroupBundle`（AES-256-GCM + scrypt）
- **DM 双轨对齐**：`dmStore.syncWithDatabase` + `data:listDmGroupIds`

### Changed
- **docs/03**：§12 数据生命周期、§12.1 DM、§12.2 退群策略
- **文件上传**：本机 `runChunkedUpload` 标注为本地队列模拟（`files.transferLocalQueue`）

### Tag
- `v1.0.0-rc.55` — 数据设置 UI、删父确认、bundle IO、DM 对齐

## [1.0.0-rc.54] - 2026-05-29

### Added
- **数据产销闭环（P0/P1 核心）**：`RealNetworkTransport.subscribeAll` 真网已读回执；`localRetentionDays`（7～365，默认 90）+ 启动/每日 prune；固定 **7 天** P2P 补拉；`data:*` IPC（存储设置、清理、单群清空）；多账号 `profiles/{userId}/` 迁移；删父任务级联/上浮；本机删文件保留元数据；`file_transfers` 30 天 purge；`verify:real-subscribe-all`

### Changed
- **offlineSync**：`requestOfflineSync` 纳入 DM `group_id`；badge 未读仅计保留窗内消息
- **TaskTreeView**：父已删子任务挂 `__root__`；退匿名群清理 `group_key_*` meta

### Tag
- `v1.0.0-rc.54` — 数据闭环 P0/P1 与 retention IPC

## [1.0.0-rc.53] - 2026-05-29

### Added
- **聊天主区「群聊 | 私聊」**：私聊会话列表移入底部「聊天」主区域；侧栏仅保留成员列表；`groupAllowsDirectMessage` 规则与单测

### Fixed
- **匿名群禁私聊**：成员列表/发现页不展示入口；`dmStore` 拒绝写入并清理历史非法来源会话
- **群聊/私聊切换条**：修正 Segmented `width:100%` 导致右侧大块空白轨道
- **亮色主题气泡**：任务/文件链接改用 `.bubbleAttachLink`，避免蓝链叠蓝底对比度不足

### Changed
- **`DmSessionBar`**：主区 `layout="main"` 会话选择器；`DiscoverModal` 匿名上下文禁用人员私聊

### Tag
- `v1.0.0-rc.53` — 聊天区群聊/私聊集中切换与匿名群禁私聊

## [1.0.0-rc.52] - 2026-05-29

### Changed
- **CI**：移除 `verify:visual-screenshots` job（无头甘特 PNG 在 GHA 不稳定）；`verify:release-gate` 不再串联截图步；保留 `npm run verify:visual-screenshots` 供本地 V-14b

### Tag
- `v1.0.0-rc.52` — CI 去掉视觉截图 job

## [1.0.0-rc.51] - 2026-05-29

### Fixed
- **CI `verify:visual-screenshots`**：等待甘特 `.bar` 任务条（非日历 grid rect）；种子任务后 `task:changed` 广播；甘特页整页 `loadUrl`；门禁改读 `capture-meta.json` 条数（放弃 PNG 体积阈值）

### Tag
- `v1.0.0-rc.51` — 视觉截图甘特条 DOM 门禁

## [1.0.0-rc.50] - 2026-05-29

### Fixed
- **CI `verify:visual-screenshots`**：截图前等待甘特 SVG 条绘制；PNG 体积改为 `max(light,dark)≥41KB` 且双侧 `≥12KB`（亮主题压缩更小，避免误杀；rc.51 已废弃体积阈值）

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
