# 06_ROADMAP

> **只保留未完成工作。** `docs/` 不存历史；已交付叙事见根目录 `CHANGELOG.md`。  
> 手验步骤见 [05_测试与联调发布.md](./05_测试与联调发布.md)。版本以 `package.json` / `CHANGELOG` 为准。  
> **进行中 Sprint** 以 `.cursorGrowth/plan.md` 为准。

---

## 0. 进行中（执行面板在 Growth）

| Sprint | Goal | 文档 |
|--------|------|------|
| — | 见 `plan.md` 候选表 | — |

**候选下一 Sprint**：见 `plan.md` 候选表（file_chunk B · 本机手验 · 真网双机等）。A6 群标签离线补拉已交付；`file_meta` 目录级仍按需 pull。会议 i18n/深链/join CTA 已交付（v1.89+）；日程 **可编辑** 见 CHANGELOG Unreleased。

---

## 1. P1 待做

| 模块 | 功能 | 备注 |
|------|------|------|
| **会议插件（可购）** | 语音 / 视频 / 屏幕共享 / 会议室 · **体验产品化** | Host/stub/mesh/LiveKit 路径已交付；见 **§3** · **§6.4** |
| 表情、书签浏览器导入导出 | 聊天/书签体验糖 | 低优先级（原 B6 体验） |
| **高级 Agent 编排** | LangGraph / 多角色 DAG 等 | L3a/L3b 已交付（`verify:ai-pipeline*`）；**可选** 外框架后置 |
| 移动端 Web | PWA 基础版本 | 后置 |

---

## 2. P2 待做

| 模块 | 功能 |
|------|------|
| 会议 Pro 扩展 | 多人视频会议、录制、日程入会（同一可购包升级档） |
| 完整插件市场 / 应用商店 | **不做**（2026-08-01）；**离线分发** → [07_插件与扩展](./07_插件与扩展.md) §13 起 |
| 原生移动 App | iOS + Android |
| WebRTC DataChannel | 可选；默认仍 TCP+UDP（见 [01](./01_产品需求文档.md) §1.3.1） |
| 匿名群可持久化历史 | 可选；现状退出即失、无文件 Tab |

---

## 3. 可购会议插件（语音 / 视频 / 会议）· 产品拍板

> 对齐 **§6**（竞品吸收 · 收费边界 · 交付分批）。  
> **原则：** 基础聊天免费；音视频会议属小众/重资源 → **做成可购插件，不进核心**。  
> Lite/POC 可免费试用；完整 SFU 会议包收费。

### 3.1 收费与边界

| 规则 | 结论 |
|------|------|
| 核心聊天（文字 / 代码 / @ / 已读） | **永久免费**，永不拆卖 |
| 语音消息 / 1v1 语音 / 视频 / 投屏 / 会议室 | **不进核心** → 插件 `lanpm.meeting`（可购） |
| 未购 / 未启用 | 聊天「语音」入口保持占位或引导升级；不实现媒体主路径 |
| 信创 / 内网 | **离线许可证**；禁止强制公网商店才能用已购插件；旁路 SFU 默认可离线安装、数据不出公网 |

### 3.2 SKU（一包多档）

| 档位 | 能力 | 技术路径 | 收费 |
|------|------|----------|------|
| **Lite / POC** | 1v1～小房间语音 + 屏幕共享（约 2～4 人） | WebRTC **mesh** + Host 代理 `desktopCapturer`；信令经 `SyncEnvelope` | 可免费试用或低价 |
| **Pro** | 语音 + 视频 + 群组会议室 | 内网旁路 **LiveKit 自托管 SFU**（**首选**；Jitsi 为 Plan B） | **可购** |
| **Pro+（P2）** | 多人会议视频格 · Pro 投屏 · 录制/日程入会打磨 | 同一插件升级档 · **meeting-pro v1.97.0 交付中** | 同授权或升级 SKU |

> 单一插件 id（如 `lanpm.meeting`）+ 能力档位；屏幕共享归入会议包。

### 3.3 与现有插件底座

| 已有 | 会议插件还需（SPIKE-374–376 已拍板） |
|------|--------------------------------------|
| `plugins/` 发现 · `pricing: free \| paid` · Profile 启停 · Slot / Host 能力白名单 · **离线许可证闸**（`license.feature` ✅ v1.75–1.76） | **深化** 会议 UX · 媒体 capability 产品化 · LiveKit 旁路运维体验；Slot `chat.toolbar.media` / `PluginZoneHost` **已有** |
| 安全红线：禁插件直连 DB / `ipcMain` | 维持；媒体经 Host 代理；**builtin registry** 注册 `lanpm.meeting`；LiveKit SDK **不进**核心 `dependencies` |

### 3.4 架构注意（无中心 vs SFU）

| 方案 | 适用 | 说明 |
|------|------|------|
| A. 旁路服务插件 | **正式 Pro 会议** | 群组内一台机器或内网小主机跑 LiveKit/Jitsi；客户端插件连接 |
| B. 小房间 mesh | Lite / POC | WebRTC mesh（2～4 人），无独立 SFU |

**禁止**默认连接公有 `meet.jit.si` / LiveKit Cloud。

### 3.5 落地节奏

| 序 | 项 | 阶段 | 状态 |
|----|-----|------|------|
| 1 | **SPIKE-会议插件**（SPIKE-374–376）：Lite mesh vs LiveKit 旁路 · `chat.toolbar.media` · Presence 侧车 | SPIKE | **已交付** · `npm run verify:meeting-spike` |
| 2 | Host 扩展 + `lanpm.meeting` stub：`PluginZoneHost` · `MeetingToolbar` · 媒体 capability · 聊天 `voiceComingSoon` → Slot/升级 CTA | P1 | **已交付** · `verify:meeting-plugin` · v1.67.0 |
| 3 | Lite mesh POC（2～4 人 · 投屏代理） | P1 | **已交付** · `verify:meeting-mesh-poc` · v1.68.0 |
| 4 | Pro LiveKit 旁路 + 离线 compose 模板 | P1～P2 | **已交付** · `verify:meeting-livekit-pro` · v1.71.0 |
| 5 | 离线许可证（内网可购） | P1～P2 | **已交付** · `verify:plugin-market-spike` · `verify:offline-license-cli` · v1.75–1.76 |
| 6 | 插件市场安装/更新 | — | **Out of scope** · 离线侧载+许可为终态（2026-08-01） |
| 7 | **meeting-media-v2**：语音消息 PTT · Lite mesh 真投屏 · 会议工具栏收纳 | P1 | **已交付** · `verify:chat-voice` · `verify:meeting-media-v2` · v1.98.0 |

验收锚点：`verify:meeting-spike` · `verify:meeting-plugin` · `verify:meeting-mesh-poc` · `verify:meeting-livekit-pro` · `verify:chat-voice` · `verify:meeting-media-v2`。

**下一实现 Sprint Goal（一句话）**：以 `.cursorGrowth/plan.md` 候选表为准（本机手验 / 搜索 / 双机真网）；插件 invoke · API v0.3 · Slot 已交付，勿再当缺口。

---

## 4. 手验待补（延期 · 非阻断）

> 发版自动化：`npm run verify:release-gate`（见 [05](./05_测试与联调发布.md) §1.3 · §8.1）。

### 4.1 发版前手勾表（与 05 §8.1 对齐）

维护者打 tag 前按序勾选；**阻断**项未绿不得发版。

| # | 项 | 自动化 / 守卫 | 手验步骤 | 阻断 |
|---|-----|---------------|----------|------|
| 1 | 发版门禁 | `npm run verify:release-gate` | — | ✅ |
| 2 | 视觉 PNG 冒烟 | `verify:visual-screenshots`（[05 §1.3.1](./05_测试与联调发布.md#131-视觉截图策略task-1221) 本地必跑） | `npm run build && npm run verify:visual-screenshots`（Linux：`xvfb-run -a`） | ✅ |
| 3 | 聊天协作抽屉 | `verify:visual` IA-401～409 · `verify:visual-screenshots` 抽屉态 | **项目群**聊天 → Composer 三按钮（文件库 / 白板 / 脑图）→ 抽屉打开 →「全屏编辑」深链；职能群仅文件库；DM 无按钮 | 建议 |
| 3b | 底栏 Tab 布局 | `verify:nav-preferences` · `verify:visual` IA-409 | **项目群**底栏：默认 **chat / board / tree** 等宽撑满；甘特/日历/files/白板/脑图默认藏，Profile → 导航可开 | 建议 |
| 3c | 会议工具条 | `verify:meeting-plugin` | 聊天输入区上方会议按钮（Lite 加入 / Pro）可点、Popover 详情无报错 | 建议 |
| 3d | Profile 插件 | `verify:plugin-ui-surfaces` | Profile → 插件：启停 `lanpm.meeting` · 导航偏好保存 | 建议 |
| 4 | 看板 / 任务树 | `verify:m3` | [05 §4](./05_测试与联调发布.md#4-看板与任务树m3) 表 6 步 | 延期 |
| 5 | 双实例 Stub | `verify:dual-stub` | [05 §3](./05_测试与联调发布.md#3-双实例-stub-联调) | 延期 |
| 6 | 真网双机 | `verify:m6` **仅 loopback** | [05 §6](./05_测试与联调发布.md#6-局域网真网联调m6) 手验清单；**未**当作 CI 已测双机 | 延期 |
| 7 | 三平台真机 UI | CI `verify.yml` × `verify:m7` | Win / mac / Linux 七页肉眼 | 延期 |
| 8 | 性能抽样 | `verify:m7-perf` · `verify:core-views-perf` · `measure:perf` / `verify:measure-perf` | [05 §5](./05_测试与联调发布.md#5-性能测量m7) Linux `out/main` 脚本已交付；安装包双击 / Win/mac 真机仍缺 | 部分 |
| 9 | 英文折行 | `verify:i18n-en` | cockpit / chat 关键页长文案肉眼 | 延期 |

### 4.2 延期汇总（有设备再补）

| 项 | 现状 |
|----|------|
| Win/mac/Linux **真机 UI** 七页肉眼 | 自动化 CI 三 OS × `verify:m7` 已闭合；真机延期 |
| **真网**双机（发现 → 加群/私聊/已读） | `verify:dual-stub` 与 `verify:m6` loopback 已闭合；**两台设备手验仍延期**（步骤 [05 §6](./05_测试与联调发布.md#6-局域网真网联调m6)） |
| 冷启动 / 空闲·聊天内存 / Tab P95 | `verify:m7-perf` + `verify:core-views-perf` + Linux `npm run measure:perf`（vite 生产构建，非安装包双击）；Win/mac 与 GPU-on 对照仍缺 |
| 英文长文案折行肉眼 | `verify:i18n-en` 无 CJK；全页折行延期 |

方法见 [05](./05_测试与联调发布.md) §2 / §5 / §6。

---

## 5. 运维协作与远程网关（ops）

> 真源：[07_插件与扩展](./07_插件与扩展.md) §27 起 · 金句「聊着聊着就把事干了」。  
> **Phase 1 已闭合**（v1.94.0–v1.94.1）；**Phase 2 部分已交付**（见 [07](./07_插件与扩展.md) §35–§38）；本节列 **未完成** 项。

| 序 | 项 | 阶段 | 状态 |
|----|-----|------|------|
| 1 | **SPIKE-OPS-001**：`tools/lanpm-gateway/` 目录列表 + 单文件收发 | SPIKE | **已交付** · `verify:ops-gateway-spike` · v1.93.2 |
| 2 | Phase 1：`lanpm-agent` + 入站/出站 + L1 斜杠命令 + `lanpm.ops` + `/status` 磁盘 | P1 | **已交付** · `verify:ops-agent` · v1.94.0–v1.94.1 |
| 3 | Phase 2（ops-p2）：机器 UX · `/disk` `/ps` `/tail` · GPU `/status` · 命令审计 · L3 分析 · 动态 `/help` · 任务挂包 · Profile 设置 | P2 | **已交付** · `verify:ops-p2` · v1.95.0 |
| 4 | Phase 2（剩余）：Ops 助手 Bot · 出站 watch · 任务挂包深化 | P2 | **已交付** · `verify:ops-p2-remaining` · v1.101.0 |
| 5 | Gateway HTTP + Web Terminal | P2～P3 | **已交付** · `verify:ops-p3` · v1.100.0 |

验收锚点（已交付）：`verify:ops-gateway-spike` · `verify:ops-agent` · `verify:ops-p2` · `verify:ops-p3` · `verify:ops-p2-remaining`。

---

## 6. 候选队列（建议序）

| 候选 | 说明 | 备注 |
|------|------|------|
| **Ops Phase 2（剩余）** | Ops 助手 Bot · Gateway HTTP · 出站 watch · 任务挂包 | **§5** |
| **SPIKE-会议插件** | mesh vs LiveKit；`lanpm.meeting` 可购 SKU | **§3** · SPIKE 已交付 |
| 插件离线分发 SPIKE | 侧载/签名 / **离线许可证** | ✅ 已交付；**应用商店不做**（离线分发终态） |
| 思维导图 | 可购插件 | ✅ Layer C · v1.74.0（见 CHANGELOG） |
| PWA | 移动端 Web | 后置 |
| 真机手验补测 | §4 延期项 | 有设备再开 |
| WebRTC DataChannel | 可选 | 非默认路径 |

### 6.1 开源替换债务（OSS-first）

> 选型纪律见 [01](./01_产品需求文档.md) §14 · [02](./02_技术实现建议.md) §16；立项走 `/plan`。

| 序 | 项 | 首选 | 不够用时 |
|----|-----|------|----------|
| 1 | PDF 预览 | ✅ `pdfjs-dist`（文件库翻页；worker `'self'`） | 裁剪/主题仍可 `3rd/pdfjs-…` |
| 2 | 全局搜索 | ✅ `minisearch`（任务/消息；成员仍内存） | 深度定制分词仍可 `3rd/` |
| 3 | 长列表虚拟化 | `react-virtuoso` | — |
| 4 | WebRTC | `simple-peer` | `3rd/simple-peer` 适配传输面 |
| 5 | IndexedDB | `idb` / `y-indexeddb` | — |
| 6 | i18n | `i18next` | — |
| 7 | 表情 / 思维导图 | emoji-mart / `@xyflow/react` | 不适配 → `3rd/` |
| 8 | Office 轻量预览 | mammoth / exceljs | — |

**保持不动**：Yjs、antd、dnd-kit、gantt-task-react、better-sqlite3、highlight.js、FullCalendar、Excalidraw、electron。

---

## 6. 竞品吸收与收费边界（飞鸽 / 飞秋）

> 品类定位见 [01](./01_产品需求文档.md) §13。开源实现态见 [02](./02_技术实现建议.md) §16 · 替换队列见本节 §5.1。

### 6.1 优先吸收（LAN+PM · 项目语义）

| ID | 吸收点 | LanPM 形态 | 状态 · 验收 |
|----|--------|------------|-------------|
| A1 | @ 与定向触达 | 群聊/任务 `@人`、`@负责人`；桌面通知催办 | **已交付** · `verify:a1-nudge` |
| A2 | 消息 ↔ 任务双向 | 消息建任务、任务看讨论、附件挂任务 | **已交付** · `verify:message-task` |
| A3 | 项目级文件区 | 群组文件库按任务归档；交付物视图 | **已交付** · `verify:project-files` |
| A4 | 传输进度 + 可取消 | 大文件进度、取消、失败重试、速率/ETA | **已交付** · `verify:transfer-a4` |
| A5 | 跨网段 / 发现少配置 | 失败可操作提示 + 发现种子 host:port | **已交付** · `verify:discover-a5` |
| A6 | 离线补同步（项目优先） | 任务/看板/已读等项目数据补同步 | 进行中 · 群标签字典已补拉（`verify:group-tag-offline`）；`file_meta` 目录级仍按需 pull |

跨平台/信创发版矩阵见 [05 §1.4](./05_测试与联调发布.md#14-跨平台发版矩阵) · `verify:platform-matrix`。

### 6.2 规划吸收（不抢 PM 主线）

| ID | 能力 | 姿态 |
|----|------|------|
| B1 | 文件断点续传 + 传输队列 | 交付物失败成阻塞再立项 |
| B2 | 成员搜索 / 轻量分组 | **已交付**（看板筛 · 指派拼音 · 聊天侧栏） |
| B3 | 项目备份 / 还原 | **已加固**（v1.25.0）；可插件化 |
| B4 | 弱网下项目同步不丢 | task_crdt / 同步可靠性主线 |
| B5 | 甘特导出 PNG/PDF | 标配或高级导出插件 |
| B6 | 表情、书签导入等 | 低优先级体验糖 |

### 6.3 免费 vs 收费（已拍板）

| 规则 | 结论 |
|------|------|
| ≥约 90% 用户都会用到 / 项目主路径刚需 | **必须免费**（核心或免费模块） |
| 仅少量用户 / 特定场景 / 重资源 | **可购**（可购插件 / 付费包） |
| 「做成插件」≠「收费」 | 插件可以是免费模块（日历、白板、基础验收） |

**交付分批：**

| 批次 | 内容 | 收费 |
|------|------|------|
| **第一波** | 日历 + 白板 + 基础验收 + 核心三角（任务↔聊↔文件） | **免费** |
| **第二波** | 高级排程、敏捷包、AI 周报 | **可购** |
| **第三波** | 完整会议 SFU、思维导图、知识库增强等 | **可购**为主 |

已交付第一波见 `CHANGELOG`；第二波起排期见 **§1** / **§3**。

### 6.4 插件边界与 SPIKE 锚点

| 能力 | 核心 | 插件 | 验收 |
|------|------|------|------|
| 投屏 / 远程 / 语音视频 / 完整会议 | ❌ | ✅ 可购（Lite mesh 可免费 POC） | `verify:meeting-spike` · §3 |
| 白板 / 协作画布 | 不进臃肿核心 | ✅ 免费模块形态 | `verify:whiteboard-realtime` · `whiteboard_crdt` |
| form-js 验收单 | ❌ | ✅ 可购 POC | `verify:plugin-loader` |
| 插件加载边界 | — | contextIsolation + 单一 `window.lanpm`；禁 `ipcMain`/直连 DB | `verify:plugin-spike` · **插件加载边界** · [07_插件与扩展](./07_插件与扩展.md) |

**仍永不插件化拆卖：** 看板 / 任务树 / 基础甘特 / 群组聊天主轴 / 发现同步。

**护城河：** 看板·树·甘特同源 + CRDT · 驾驶舱 · 群组=项目边界 · 数据不出域的项目管理。

---

## 7. 文档指针

| 内容 | 位置 |
|------|------|
| 已交付对外说明 | 根目录 `CHANGELOG.md` |
| 跨平台矩阵 | [05](./05_测试与联调发布.md) §1.4 |
| 测试与联调 | [05_测试与联调发布.md](./05_测试与联调发布.md) |
| 竞品定位 | [01](./01_产品需求文档.md) §13 |
| 竞品吸收 · 收费 · 验收锚点 | 本节 **§6** |
| 依赖 / 开源选型 | [02](./02_技术实现建议.md) §16 · [01](./01_产品需求文档.md) §14 |
| 开源替换债务 | 本节 **§5.1** |
| 插件架构 | [07_插件与扩展.md](./07_插件与扩展.md) |
| 聊天性能（已交付 v1.83–v1.93） | `CHANGELOG` `[1.83.0]`–`[1.93.0]` · 本地 `.cursorGrowth/decisions/chat-perf.md` |
| Sprint 执行 | `.cursorGrowth/plan.md`（本地） |
