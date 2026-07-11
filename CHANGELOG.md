# Changelog

本文件记录 LanPM 项目变更，最新条目在最上方。

## [Unreleased]

### Added
- **SPRINT-TEXT-CARET-AWARENESS 收尾 (TASK-200)**：`verify:text-caret`；docs/04·06·README 对齐描述框协同光标；归档；handoff `/release` → **v1.7.0**。
- **描述框 caret 接线 (TASK-199)**：TaskDetailPanel + TaskEditModal 挂 overlay；选区变化广播 caret。
- **RemoteCaretOverlay (TASK-198)**：彩色竖线 + 显示名；按 UTF-16 offset 定位；i18n。
- **caret 桥接 (TASK-197)**：store `descriptionCarets`；`useDescriptionCaretBroadcast`；失焦清除。
- **caret 透传验收 (TASK-196)**：`verify:task-awareness` 覆盖含 caret 的 Awareness round-trip。
- **文本 caret 协议 (TASK-195)**：`TaskAwarenessLocalState.caret`（`description` + UTF-16 offset）；校验/单测；docs/03。
- **SPRINT-GROUP-TAG-DICT 收尾 (TASK-194)**：`verify:group-tag-dict`；docs/04·06·README 对齐群标签字典；归档；handoff `/release` → **v1.6.0**。
- **群标签字典协议 (TASK-189)**：`GroupTagMeta` / `GroupTagPatchPayload`；`SyncMessageType.group_tag_patch`；docs/03；`verify:sync-handlers` 登记。
- **群标签字典持久化 (TASK-190)**：schema v6 表 `group_tag_meta` + migrate；repository；删群级联。
- **群标签字典同步 (TASK-191)**：`groupTagSyncService` publish/apply `group_tag_patch`；匿名群跳过；挂入 taskSync。
- **群标签字典桥接 (TASK-192)**：IPC list/upsert/remove/import；preload · lanpm-api · browser stub；本机色一次性导入。
- **群标签字典 UI (TASK-193)**：`groupTagStore`；BoardTagPalette/芯片/详情读群字典；改色走 IPC；i18n「已同步」提示。
- **SPRINT-BOARD-TAG-FILTER 收尾 (TASK-188)**：`verify:task-tags-filter`；docs/04·06·README 对齐标签筛选/本机色板；归档；handoff `/release` → **v1.5.0**。
- **看板标签筛选与色板 (TASK-184–186)**：工具栏多选 OR 筛选；KanbanCard 着色芯片；本机色板（uiStore/localStorage）。
- **任务详情标签色 (TASK-187)**：详情面板芯片与看板同色逻辑。
- **标签筛选/色哈希 (TASK-183)**：`filterTasksByTags`（OR）· `collectUniqueTaskTags` · `tagColorHash` / `resolveTagColor` + 单测。
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
