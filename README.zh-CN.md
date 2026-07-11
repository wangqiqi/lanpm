<p align="center">
  <img src="resources/logo.svg" alt="LanPM" width="96" height="96" />
</p>

<h1 align="center">LanPM</h1>

<p align="center">
  <strong>飞秋般畅聊，项目经理般协作，数据留在你的局域网。</strong>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="#-产品截图">产品截图</a> ·
  <a href="#-为什么选择-lanpm">为什么选我们</a> ·
  <a href="#-核心能力">核心能力</a> ·
  <a href="#-快速开始">快速开始</a> ·
  <a href="#-文档">文档</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.22.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform" />
  <img src="https://img.shields.io/badge/技术栈-Electron%20%2B%20React%20%2B%20TypeScript-61dafb" alt="stack" />
  <img src="https://img.shields.io/badge/架构-无中心服务器%20%7C%20P2P-success" alt="sync" />
</p>

---

## ✨ 一句话

**LanPM** 是一款**分布式局域网 / VPN 协作桌面客户端**：把**即时通讯**、**项目管理**（看板 · 任务树 · 甘特 · 日历）、**群协作白板**和**文件共享**装进**同一窗口**——**无需中心服务器**，核心业务数据在群组内点对点同步，**不出域**。

---

## 📸 产品截图

<p align="center">
  <img src="assets/chat.png" alt="LanPM 聊天 — 成员列表、消息区与底部七 Tab 导航" width="920" />
</p>
<p align="center"><sub><b>聊天</b> — 群聊 / 私聊、成员状态、代码高亮、七视图主壳</sub></p>

<table>
  <tr>
    <td width="50%"><img src="assets/kanban.png" alt="LanPM 看板 — 四列拖拽与任务卡片" width="100%" /></td>
    <td width="50%"><img src="assets/gantt.png" alt="LanPM 甘特图时间轴" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>看板</b> — 拖拽流转、任务族配色、标签与工期健康度</sub></td>
    <td align="center"><sub><b>甘特图</b> — 时间轴、依赖、里程碑、导出</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/task-tree.png" alt="LanPM 任务树层级结构" width="100%" /></td>
    <td width="50%"><img src="assets/file.png" alt="LanPM 群组文件库" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>任务树</b> — 父子层级、进度汇总、跨视图定位</sub></td>
    <td align="center"><sub><b>文件</b> — 上传下载、书签、按任务交付物</sub></td>
  </tr>
</table>

<p align="center">
  <img src="assets/export-gantt.png" alt="LanPM 甘特图导出 PNG / PDF" width="720" />
</p>
<p align="center"><sub><b>甘特导出</b> — 图表视图一键导出 PNG / PDF · <i>应用内另有：日历（月/周）· 白板（Excalidraw 实时同画）</i></sub></p>

---

## 🎯 为什么选择 LanPM

| 常见痛点 | LanPM 的做法 |
|----------|----------------|
| 聊天工具做不了正经项目视图 | **七大视图一体**：聊天 · 看板 · 任务树 · 甘特 · 日历 · 白板 · 文件 |
| 项目管理强依赖云端账号 | **群组内 P2P 同步**，局域网发现节点，不绑公有云 |
| 敏感文件只能走 SaaS | **本地 SQLite 优先**，传输加密，**Office 本地 LibreOffice 预览** |
| 飞秋 / 飞鸽好用但没有任务 | **保留 IM 体验**，叠加看板、日历、白板、依赖关系、领导驾驶舱 |

```
   ┌──────────────────────────────────────────────────────────────────┐
   │  即时通讯 + 项目管理（看板/树/甘特/日历）+ 协作白板               │
   │              + 文件共享 + 领导驾驶舱 + AI 辅助（可选）            │
   │                                                                  │
   │        核心业务数据在局域网内同步，不出域（AI 可脱敏外呼）          │
   └──────────────────────────────────────────────────────────────────┘
```

---

## 🚀 核心能力

### 💬 沟通

- 群聊 / 私聊、**@提及**、已读回执、桌面通知  
- **代码语法高亮**、附件、聊天内 **`/task`** 建任务、**`#`** 引用任务  
- **消息 ↔ 任务（A2）**：气泡一键建任务；详情讨论区；文件挂任务  
- **7 天离线补同步**：聊天（分页）、任务/依赖、已读回执  
- **弱网推送 Outbox（B4）**：任务/文件/标签 publish 失败持久排队，重连后自动重试（`sync_outbox`）  
- 历史 **上滑续载**；发送失败 **`failed`** + 自动重试 / 气泡 **手动重试**  
- 顶栏 **发现**：加群、点成员私聊；**发现种子**支撑 VPN / 跨网段（A5）  
- 顶栏 **群切换器**：汉字/拼音搜索、本机置顶、按最近消息排序  
- 群主 **解散** 经 `member_event` 清对端；**头像** 在顶栏 / 气泡 / 成员列表可见  

### 📋 项目管理

- **看板**：拖拽流转、任务族配色、FS/SS/FF/SF 依赖；**标签**（群字典、OR 筛选、色板）  
- **任务树**：父子层级、进度汇总、在看板/甘特中定位  
- **甘特图**：时间轴、里程碑、依赖连线、缩放、PNG/PDF 导出  
- **日历**：月/周（FullCalendar）；**拖拽 / 拉伸改期**；无日期任务与甘特同默认窗口  
- **工期健康度**（正常 / 落后 / 延期）在看板、树、甘特、驾驶舱语义一致  
- **验收清单**：勾选进度；未完成项可建子任务  
- **Presence**：谁在看任务；描述框 **协同光标（caret）**  
- **A1 催办（v1.20.0）**：今日/逾期桌面提醒（可关）；聊天 `@负责人` 别名；任务详情 **催办负责人**  
- **B2 成员搜索**：看板按负责人拼音/关键词筛选、指派下拉可搜、聊天侧栏成员搜索（`verify:member-search`）  
- **插件 loader + form-js POC**：发现 `plugins/*/plugin.json`；Host 能力代理；任务详情槽挂免费 stub + 可购 form-js schema POC（`verify:plugin-loader`）  
- **插件启用 UI**：个人资料「扩展」Tab 启停官方插件；详情槽即时刷新（`verify:plugin-enable-ui`）  
- 底栏角标：聊天未读 · 看板 **与我相关未完成** · 近期变更弱红点  

### 🎨 协作白板

- 第 7 Tab：**Excalidraw** 群级白板（一群一板）  
- **实时 CRDT** + 指针 Awareness，走群内 P2P（不上公网 room）  
- 可从任务打开并关联；导出 PNG 进群文件库  

### 📁 文件协作

- 群组内上传下载、**断点续传**与传输队列  
- **取消 / 重试 / 速率 · ETA**（A4 · v1.19.0）  
- **LibreOffice 本地转换预览** Office 文档  
- 网址书签 + 应用内 WebView  
- **交付物（A3）**：按任务筛选；文件 Tab 挂接 / 解挂  

### 🏢 组织形态与身份

- **项目群 / 职能群 / 匿名群** — Tab 按类型启停（日历/白板仅项目群）  
- **领导驾驶舱**：项目总览、报表、可选 AI API Key  
- **一人多设备**：任一设备在线即在线；后缀区分同名  
- **亮色 / 暗色** 主题 · **中 / 英** 界面  

### 🔒 安全与发版

- 传输层 **AES-GCM + ECDH**（详见 [技术实现建议](./docs/02_技术实现建议.md)）  
- 不强制上云；AI 可按需、可脱敏外呼  
- **跨平台安装包**：Win / macOS / Linux × **x64 + arm64**（`docs/07`，`verify:platform-matrix`）  
- 发版前可跑 **`npm run verify:m7`** 全量回归  
- 插件 **加载边界** 已 SPIKE 拍板；加载器尚未落地  

---

## ⚡ 快速开始

### 环境要求

- **Node.js** 20+（推荐 22 LTS）  
- **npm** 10+  
- **Git**  

### 30 秒跑起来（Linux / macOS / Git Bash）

```bash
git clone <你的仓库地址> lanpm && cd lanpm
chmod +x onekey_run.sh    # 首次需要
./onekey_run.sh start     # 后台 dev，日志见 .lanpm/dev.log
```

或使用 npm：

```bash
npm install    # postinstall 自动对齐 better-sqlite3 与 Electron ABI
npm run dev    # 启动 Electron 开发壳
```

### Windows

| 终端 | 命令 |
|------|------|
| CMD | `onekey_run.bat start` |
| PowerShell | `.\onekey_run.ps1 start` |
| Git Bash / WSL | `./onekey_run.sh start` |

首次启动会走**配置向导**（用户名、设备名、可选部门与头像），完成后进入主壳，默认示例路由 `#/g/demo-project/chat`。

---

## 🛠️ 开发者

```bash
npm run lint && npm run typecheck
npm run test              # Vitest 单元测试
npm run verify:p0         # P0 一致性守卫（IPC / i18n / 文档 …）
npm run verify:m7         # RC 全量回归（发版前推荐）
npm run build             # 生产构建
npm run dist:linux:x64    # electron-builder 按平台/arch 打安装包
npm run verify:platform-matrix  # 跨平台发版矩阵静态验收
```

| 说明 | 命令 / 注意 |
|------|-------------|
| 仅浏览器 UI 预览 | `npm run dev:web` — **验收以 Electron 为准**（IPC / SQLite） |
| 视觉一致性门禁 | `npm run verify:visual`（见 [docs/06](./docs/06_验收与里程碑计划.md) §2.6） |
| 功能验收脚本 | `verify:transfer-a4` · `verify:project-files` · `verify:discover-a5` · `verify:whiteboard-realtime` · `verify:calendar-drag` · `verify:checklist` · `verify:message-task` · … |
| 跨平台安装包 | `dist:win` / `dist:mac` / `dist:linux`（可加 `:x64` / `:arm64`）；矩阵见 [docs/07](./docs/07_跨平台发版矩阵.md) |
| 一键脚本菜单 | `./onekey_run.sh` → start / stop / status / build / check … |

### 浏览器 Stub 与 Electron 差异

| 场景 | Electron（`npm run dev`） | 浏览器 Vite（`:5173`） |
|------|---------------------------|-------------------------|
| IPC / SQLite | 主进程真实 API 或 Stub | 内存桩 `browserLanpmStub` |
| 文件上传/预览 | 系统对话框 + 本地路径 | 受限或 mock |
| 推荐验收 | ✅ **以此为准** | 仅 UI 快速预览 |

Stub 错误文案走 i18n（`verify:i18n-en` 守卫）。

---

## 🧱 技术选型

| 层级 | 选型 |
|------|------|
| 桌面 | **Electron** |
| 前端 | **React 18** + **TypeScript** + **Ant Design 5** |
| 状态 | **Zustand** · 样式 **CSS Modules** |
| 日历 | **FullCalendar**（含 interaction 拖拽/拉伸） |
| 白板 | **Excalidraw** + Yjs / `@mizuka-wu/y-excalidraw` |
| 甘特 | **gantt-task-react** |
| 持久化 | **SQLite**（唯一持久化层） |
| 同步 | UDP 发现 + TCP/P2P；任务 CRDT · 白板 CRDT · AES-GCM 传输 |
| 打包 | electron-builder — Win / macOS / Linux × x64 + arm64 |

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [docs/00 — 导航](./docs/00_文档导航.md) | 索引、追溯矩阵、已拍板决策 |
| [docs/01 — PRD](./docs/01_产品需求文档.md) | 产品需求 |
| [docs/02 — 架构](./docs/02_技术实现建议.md) | 系统设计、网络与安全 |
| [docs/03 — 数据与协议](./docs/03_数据模型与协议草案.md) | Schema、同步消息 |
| [docs/04 — 交互](./docs/04_交互与UI约定.md) | 布局、主题、七视图主壳 |
| [docs/05 — 测试](./docs/05_测试与联调发布.md) | Vitest、verify:*、联调发布 |
| [docs/06 — 验收](./docs/06_验收与里程碑计划.md) | P0 验收、里程碑、RC 发布门禁 |
| [docs/07 — 跨平台](./docs/07_跨平台发版矩阵.md) | 跨平台构建与 CI |
| [飞鸽 / 飞秋对照](./docs/飞鸽飞秋.md) | 与经典局域网 IM 的能力对照 |

---

## 🗺️ 版本与路线图

| 阶段 | 内容 |
|------|------|
| **M0–M1** | 工程骨架、首次配置、多视图主框架 |
| **M2–M5** | 聊天 / 任务 / 文件 / 群组 / 驾驶舱 |
| **M6–M7** | 真网路径、性能与发布门禁 |
| **v1.1–v1.19** | CRDT · 标签 · Presence · 日历 · 白板实时 · 交付物 · 发现加固 · 传输 UX · 跨平台矩阵 |

**当前版本：** `1.22.0` — 插件 loader + form-js POC（`verify:plugin-loader`），B2 成员搜索（1.21）、A1 催办（1.20）、传输 A4 + 插件 SPIKE（1.19）。许可：[AGPL-3.0-or-later](./LICENSE)。真机手验仍延期，见 [验收计划](./docs/06_验收与里程碑计划.md) §2.6。

**进行中 / 队列：** B4 sync_outbox → **1.24.0** · B3 备份加固 · 市场 SPIKE。

**规划中（P1+）：** 屏幕共享、语音通话、思维导图、移动端 PWA 等 —— [完整列表](./docs/06_验收与里程碑计划.md)。

---

## 🌐 语言

- **简体中文** — 本文件  
- **English** — [README.md](./README.md)

---

<p align="center">
  <sub>为「既要飞秋般爽快沟通，又要正经项目管理、还不愿把数据交给公有云」的团队而生。</sub>
</p>
