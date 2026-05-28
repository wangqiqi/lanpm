# LanPM Todo List（执行清单，细化版）

> 对齐 `plan.md` 的 M0-M7，并与 `docs/00~06` 一致。  
> 状态：`[ ]` 未开始 / `[-]` 进行中 / `[x]` 已完成 / `[c]` 取消  
> 优先级：`P0` 阻断级 / `P1` 重要 / `P2` 可延后  
> 依赖：`dep: Mx-yy`

---

## 0. 使用方式（团队约定）

- 每天开工先更新“当前周冲刺”区，最多 1 个 `[-]` 进行中主任务。
- 每个任务完成时，必须同步补“完成标准（DoD）”中的证据（截图/命令/日志路径）。
- 每完成 1 个里程碑，回填 `plan.md` 9.2 与 `CHANGELOG.md`。

---

## M0 项目初始化（Day 1-2）

### M0-A 工程骨架

- [x] `M0-01` [P0] 初始化 Electron + React18 + TypeScript 工程（DoD：`npm run dev` 可启动）
- [x] `M0-02` [P0] 建立目录：`src/main` / `src/preload` / `src/renderer`（DoD：目录与基础入口文件齐全）
- [x] `M0-03` [P1] 配置 lint/format/tsconfig 基线（DoD：`npm run lint` 通过）

### M0-B 本地存储与身份

- [x] `M0-04` [P0] 建 SQLite 初始化脚本（按 `docs/04` §11 DDL）（DoD：首次启动自动建库建表；证据：`npm run verify:storage`；`app.whenReady` → `initDatabase()` → `{userData}/lanpm.db`）
- [x] `M0-05` [P0] 实现 `users/devices` 读写仓储（DoD：可写入并读回 `userId/deviceId`；证据：`userRepository`/`deviceRepository` + `verify:storage` 往返）
- [x] `M0-06` [P0] 首次配置向导 UI（用户名/部门/头像；设备名自动 hostname）（DoD：未配置时强制进入向导；`getSuggestedDeviceName` + `completeSetup` 无主填设备名；`sync_meta.local_device_id` 持久化）
- [x] `M0-07` [P0] 后缀规则：自动 `-yymm` + 手动唯一性校验（DoD：`npm run verify:suffix`；`allocateUserIdWithLanCheck` 本机 DB + LAN peer 集）
- [x] `M0-08` [P0] 定义传输接口 `NetworkTransport`（DoD：`src/shared/network/types.ts` 对齐 `docs/04` §6.4）
- [x] `M0-09` [P0] 实现 `NetworkStub.publish/subscribe/discoverPeers`（DoD：`npm run verify:network-stub`；`$TMP/lanpm-stub` 文件总线双实例）
- [x] `M0-10` [P1] Stub 去重与顺序（`msgId`/`lamportTs`）（DoD：`MessageDedup` + `LamportClock`；verify 含重复投递用例）

---

## M1 主框架（Day 3-4）

### M1-A 路由与框架

- [x] `M1-01` [P0] 实现 5 视图路由：聊天/看板/任务树/甘特/文件（dep: M0-01）（DoD：`HashRouter` + `/g/:groupId/:view`；`npm run verify:routes`；`npm run dev` 底部 Tab 切换五视图）
- [x] `M1-02` [P0] 顶部栏：项目切换/驾驶舱/搜索/主题/语言/用户面板（DoD：`TopBar` + `layout/MainLayout`；`npm run verify:topbar`；HashRouter 下 `useLocation` 切群保留视图）
- [x] `M1-03` [P0] 群组类型 Tab 规则（项目全开、职能部分、匿名仅聊天）（DoD：`tabRules.ts` + `BottomNav` 置灰；`verify:routes`；占位群组下拉可验三种类型）

### M1-B UI 基础设施

- [x] `M1-04` [P0] 选型并锁定 UI 组件库（Ant Design 5.x + CSS Modules + Zustand）（DoD：见 `docs/05` §8）
- [x] `M1-05` [P1] 主题持久化（`localStorage.theme`）与暗黑模式（DoD：`uiStore` + `ThemeProvider` + `html[data-theme]`；`verify:topbar` 键名校验）
- [x] `M1-06` [P1] i18n 基础框架（`zh-CN/en-US`）（DoD：`src/renderer/src/i18n/messages.ts` + `useI18n`；顶栏/底栏文案切换）

---

## M2 聊天主链路（Day 5-7，Stub 联调）

### M2-A 消息能力

- [x] `M2-01` [P0] 文本消息发送/接收（dep: M0-09）（DoD：`chatService` + `ChatView` + `npm run verify:chat`；NetworkStub 双实例可收发）
- [x] `M2-02` [P0] 代码消息（语言识别 + 高亮）（DoD：`sendCodeMessage` + `CodeBlock`(highlight.js) + `npm run verify:chat`）
- [ ] `M2-03` [P0] @提及与桌面通知
- [ ] `M2-04` [P0] 私聊入口与会话切换

### M2-B 回执与成员状态

- [ ] `M2-05` [P0] 成员在线态（🟢🟡⚪）聚合展示
- [ ] `M2-06` [P0] 已读回执：按 `userId` 聚合（任一设备已读即已读）
- [ ] `M2-07` [P0] `/task` 快捷创建任务入口（与 `docs/03` §16.3 P0 一致）

### M2-C 联调验收

- [ ] `M2-08` [P0] 单机双实例联调（按 `docs/06` §1 全通过）

---

## M3 看板 + 任务树（Day 8-10）

- [ ] `M3-01` [P0] 任务模型与仓储（CRUD，含 `status/priority/assignee`）
- [ ] `M3-02` [P0] 看板四列与拖拽（UI: TODO/IN PROGRESS/DONE/OTHER；存储: `todo`/`doing`/`done`/`other`；`@dnd-kit/core`）
- [ ] `M3-03` [P0] `OTHER` 原因强校验
- [ ] `M3-04` [P0] 任务树父子结构、展开折叠
- [ ] `M3-05` [P0] 父任务进度聚合计算
- [ ] `M3-06` [P1] `/task` 从聊天落到看板卡片闭环

---

## M4 甘特图 + 文件（Day 11-13）

### M4-A 甘特图

- [ ] `M4-00` [P0] 集成 `gantt-task-react` 与任务数据源（dep: M3-01）（DoD：见 `docs/05` §6.3）
- [ ] `M4-01` [P0] 日/周/月切换
- [ ] `M4-02` [P0] 任务条拖拽改起止时间
- [ ] `M4-03` [P0] 依赖关系（FS/SS/FF/SF）与里程碑标识
- [ ] `M4-04` [P1] 甘特导出 PNG/PDF

### M4-B 文件模块

- [ ] `M4-05` [P0] 文件列表/筛选/详情
- [ ] `M4-06` [P0] LibreOffice 本地预览链路
- [ ] `M4-07` [P0] 分片传输 + 断点续传 + 并发队列（<=3）
- [ ] `M4-08` [P1] 书签导入导出

---

## M5 群组 + 驾驶舱（Day 14-15）

- [ ] `M5-01` [P0] 三类群组创建与切换（project/function/anonymous）
- [ ] `M5-02` [P0] 匿名群限制策略（仅文本，无历史/无文件）
- [ ] `M5-03` [P0] 驾驶舱指标卡（项目总数/进行中/延期）
- [ ] `M5-04` [P0] 项目进度列表与部门完成率
- [ ] `M5-05` [P0] API-Key 配置与本地加密存储
- [ ] `M5-06` [P0] AI 手动审核/评估/周报触发（仅脱敏字段）

---

## M6 真实网络替换（Day 16-18）

- [ ] `M6-01` [P0] UDP 广播发现（端口 43123、心跳/超时参数按 `docs/02`）
- [ ] `M6-02` [P0] WebRTC DataChannel 建链与重连
- [ ] `M6-03` [P0] DH + AES-GCM 加密收发
- [ ] `M6-04` [P0] 用真实网络替换 Stub（保留 Stub 作为测试替身）
- [ ] `M6-05` [P0] 同用户多设备在线聚合复验
- [ ] `M6-06` [P0] 真网双机/多机联调（按 `docs/06` §3）

---

## M7 测试与发布（Day 19-20）

- [ ] `M7-01` [P0] `docs/03` §16.1~16.12 全量验收打勾
- [ ] `M7-02` [P0] 性能测试（冷启动/内存/P95 响应，按 `docs/06` §2）
- [ ] `M7-03` [P0] 稳定性测试（崩溃恢复/离线补同步）
- [ ] `M7-04` [P0] 缺陷清零（P0/P1）
- [ ] `M7-05` [P0] RC 打版 + `CHANGELOG.md` 更新

---

## 当前周冲刺（实时更新）

- [x] `M0-01` 初始化 Electron + React18 + TypeScript 工程
- [x] `M0-04` SQLite 初始化脚本与建表
- [x] `M0-05` users/devices 读写仓储
- [x] `M0-06` 首次配置向导 UI
- [x] `M0-07`~`M0-10` 后缀规则 + NetworkStub（`npm run verify:m0`）
- [x] `M1-01` 五视图路由 + 底部导航（`verify:routes`）
- [x] `M1-03` 群组类型 Tab 规则（占位三群组）
- [x] `M1-04` UI 组件库已拍板（Ant Design 5.x + CSS Modules + Zustand）
- [x] `M1-02`~`M1-06` 顶部栏 + 主题 + i18n（`verify:m1`）
- [x] `M2-01` 文本消息收发（`verify:chat`）
- [x] `M2-02` 代码消息 + 语法高亮（highlight.js）
