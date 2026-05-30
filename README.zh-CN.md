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
  <img src="https://img.shields.io/badge/版本-1.0.0--rc.76-blue" alt="version" />
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform" />
  <img src="https://img.shields.io/badge/技术栈-Electron%20%2B%20React%20%2B%20TypeScript-61dafb" alt="stack" />
  <img src="https://img.shields.io/badge/架构-无中心服务器%20%7C%20P2P-success" alt="sync" />
</p>

---

## ✨ 一句话

**LanPM** 是一款**分布式局域网 / VPN 协作桌面客户端**：把**即时通讯**、**项目管理**（看板 · 任务树 · 甘特图）和**文件共享**装进**同一窗口**——**无需中心服务器**，核心业务数据在群组内点对点同步，**不出域**。

---

## 📸 产品截图

<p align="center">
  <img src="assets/chat.png" alt="LanPM 聊天 — 成员列表、消息区与底部五 Tab 导航" width="920" />
</p>
<p align="center"><sub><b>聊天</b> — 群聊 / 私聊、成员状态、代码高亮、统一主壳</sub></p>

<table>
  <tr>
    <td width="50%"><img src="assets/kanban.png" alt="LanPM 看板 — 四列拖拽与任务卡片" width="100%" /></td>
    <td width="50%"><img src="assets/gantt.png" alt="LanPM 甘特图时间轴" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>看板</b> — 拖拽流转、任务族配色、工期健康度</sub></td>
    <td align="center"><sub><b>甘特图</b> — 时间轴、依赖、里程碑</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/task-tree.png" alt="LanPM 任务树层级结构" width="100%" /></td>
    <td width="50%"><img src="assets/file.png" alt="LanPM 群组文件库" width="100%" /></td>
  </tr>
  <tr>
    <td align="center"><sub><b>任务树</b> — 父子层级、进度汇总、跨视图定位</sub></td>
    <td align="center"><sub><b>文件</b> — 上传下载、书签、本地预览</sub></td>
  </tr>
</table>

<p align="center">
  <img src="assets/export-gantt.png" alt="LanPM 甘特图导出 PNG / PDF" width="720" />
</p>
<p align="center"><sub><b>甘特导出</b> — 图表视图一键导出 PNG / PDF</sub></p>

---

## 🎯 为什么选择 LanPM

| 常见痛点 | LanPM 的做法 |
|----------|----------------|
| 聊天工具做不了正经项目视图 | **五大视图一体**：聊天 · 看板 · 任务树 · 甘特 · 文件 |
| 项目管理强依赖云端账号 | **群组内 P2P 同步**，局域网发现节点，不绑公有云 |
| 敏感文件只能走 SaaS | **本地 SQLite 优先**，传输加密，**Office 本地 LibreOffice 预览** |
| 飞秋 / 飞鸽好用但没有任务 | **保留 IM 体验**，叠加看板、依赖关系、领导驾驶舱 |

```
   ┌──────────────────────────────────────────────────────────────┐
   │  即时通讯（飞秋/飞鸽体验） + 项目管理（看板/树/甘特）          │
   │              + 文件共享 + 领导驾驶舱 + AI 辅助（可选）         │
   │                                                              │
   │        核心业务数据在局域网内同步，不出域（AI 可脱敏外呼）       │
   └──────────────────────────────────────────────────────────────┘
```

---

## 🚀 核心能力

### 💬 团队每天都在用的沟通

- 群聊 / 私聊、**@提及**、已读回执、桌面通知  
- **代码语法高亮**、附件、聊天内 **`/task`** 一键建任务  
- **7 天离线消息补同步**（RC 已落地）  
- 顶栏 **「发现」**：加入局域网群组、点成员直接私聊  

### 📋 项目管理 —— 三个视角，一套数据

- **看板**：拖拽流转、任务族配色、拖列时 **FS/SS/FF/SF** 依赖校验  
- **任务树**：父子层级、进度汇总、一键「在看板 / 甘特中定位」  
- **甘特图**：时间轴、里程碑、依赖连线、跨视图高亮定位与滚动  
- **工期健康度**（正常 / 落后 / 延期）在看板、任务树、甘特、驾驶舱**语义一致**  

### 📁 文件协作，数据不出楼

- 群组内上传下载、**断点续传**与传输队列（RC）  
- **LibreOffice 本地转换预览** Office 文档，预览过程不离开本机  
- 网址书签 + 应用内 WebView  

### 🏢 贴合真实组织形态

- **项目群 / 职能群 / 匿名群** 三类，底部 Tab 按群类型自动启停  
- **领导驾驶舱**：项目总览、报表、可选 AI 的 API Key 配置  
- **一人多设备**：任一设备在线即显示在线；后缀区分同名用户  
- **亮色 / 暗色** 主题，**中 / 英** 界面切换  

### 🔒 安全与主权（RC）

- 传输层 **AES-GCM + ECDH**（详见 [技术实现建议](./docs/02_技术实现建议.md)）  
- 不强制上云；AI 等能力可按需、可脱敏外呼  
- 发布前可跑 **`npm run verify:m7`** 全量自动化回归  

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
```

| 说明 | 命令 / 注意 |
|------|-------------|
| 仅浏览器 UI 预览 | `npm run dev:web` — **验收以 Electron 为准**（IPC / SQLite） |
| 视觉一致性门禁 | `npm run verify:visual`（见 [docs/06](./docs/06_验收与里程碑计划.md) §2.6） |
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
| 甘特 | **gantt-task-react** |
| 持久化（RC） | **SQLite**（唯一持久化层） |
| 网络（RC） | UDP 发现 + TCP/P2P 联调路径；应用层加密 |
| 规划 | Yjs CRDT · WebRTC · IndexedDB 热缓存（post-RC） |

---

## 📚 文档

| 文档 | 说明 |
|------|------|
| [docs/00 — 导航](./docs/00_文档导航.md) | 索引、追溯矩阵、已拍板决策 |
| [docs/01 — PRD](./docs/01_产品需求文档.md) | 产品需求 |
| [docs/02 — 架构](./docs/02_技术实现建议.md) | 系统设计、网络与安全 |
| [docs/04 — 交互](./docs/04_交互与UI约定.md) | 布局、主题、组件约定 |
| [docs/05 — 测试](./docs/05_测试与联调发布.md) | Vitest、verify:*、联调发布 |
| [docs/06 — 验收](./docs/06_验收与里程碑计划.md) | P0 验收、里程碑、RC 发布门禁 |

---

## 🗺️ 版本与路线图

| 阶段 | 内容 |
|------|------|
| **M0–M1** | 工程骨架、首次配置、五大视图主框架 |
| **M2–M5** | 聊天 / 任务 / 文件 / 群组 / 驾驶舱 |
| **M6–M7** | 真网路径、性能与发布门禁 |

**当前版本：** `1.0.0-rc.76`（M0–M7 自动化已闭环）。注意：**`verify:m7` 通过** 不等于 **PRD P0 全部完成**，也不等于 **1.0.0 正式发布门禁已满足** —— 详见 [验收计划](./docs/06_验收与里程碑计划.md) §2。

**规划中（P1+）：** 屏幕共享、语音通话、思维导图、插件系统、移动端 PWA 等 —— [完整列表](./docs/06_验收与里程碑计划.md)。

---

## 🌐 语言

- **简体中文** — 本文件  
- **English** — [README.md](./README.md)

---

<p align="center">
  <sub>为「既要飞秋般爽快沟通，又要正经项目管理、还不愿把数据交给公有云」的团队而生。</sub>
</p>
