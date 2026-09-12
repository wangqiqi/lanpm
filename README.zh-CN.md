<p align="center">
  <img src="resources/logo.svg" alt="LanPM" width="96" height="96" />
</p>

<h1 align="center">LanPM</h1>

<p align="center">
  <strong>飞秋般畅聊，项目经理般协作，数据留在你的局域网。</strong>
</p>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="https://wangqiqi.github.io/lanpm/zh/">项目主页</a> ·
  <a href="#-更多视图">视图</a> ·
  <a href="#-为什么选择-lanpm">为什么</a> ·
  <a href="#-核心能力">能力</a> ·
  <a href="#-快速开始">上手</a> ·
  <a href="#-文档">文档</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/版本-1.106.16-blue" alt="version" />
  <img src="https://img.shields.io/badge/平台-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey" alt="platform" />
  <img src="https://img.shields.io/badge/技术栈-Electron%20%2B%20React%20%2B%20TypeScript-61dafb" alt="stack" />
  <img src="https://img.shields.io/badge/架构-无中心服务器%20%7C%20P2P-success" alt="sync" />
</p>

<p align="center">
  <img src="assets/chat.png" alt="LanPM — 聊天与八大视图主壳" width="960" />
</p>
<p align="center"><sub><b>聊天</b> — 群聊 / 私聊、成员状态、代码高亮、八视图主壳</sub></p>

**LanPM** 是**分布式局域网 / VPN 协作桌面客户端**：即时通讯与项目管理装进同一 Electron 壳，群组内 **P2P 同步**，**不绑公有云**。

## 📸 更多视图

<table>
  <tr>
    <td width="50%"><img src="assets/kanban.png" alt="看板" width="100%" /><br /><sub><b>看板</b> — 拖拽流转、标签、工期健康度</sub></td>
    <td width="50%"><img src="assets/task-tree.png" alt="任务树" width="100%" /><br /><sub><b>任务树</b> — 层级、汇总、跨视图定位</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/gantt.png" alt="甘特图" width="100%" /><br /><sub><b>甘特图</b> — 时间轴、依赖、导出 PNG/PDF/Markdown/CSV</sub></td>
    <td width="50%"><img src="assets/calendar.png" alt="日历" width="100%" /><br /><sub><b>日历</b> — 拖拽改期</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/whiteboard.png" alt="白板" width="100%" /><br /><sub><b>白板</b> — Excalidraw 实时同画（聊天抽屉）</sub></td>
    <td width="50%"><img src="assets/mindmap.png" alt="脑图" width="100%" /><br /><sub><b>脑图</b> — Yjs 协同（聊天抽屉）</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="assets/file.png" alt="文件" width="100%" /><br /><sub><b>文件</b> — 断点续传、交付物（聊天抽屉）</sub></td>
    <td width="50%"><img src="assets/cockpit.png" alt="领导驾驶舱" width="100%" /><br /><sub><b>驾驶舱</b> — 跨群需关注与项目健康度</sub></td>
  </tr>
</table>

## 🎯 为什么选择 LanPM

| 常见痛点 | LanPM 的做法 |
|----------|----------------|
| 聊天工具做不了正经项目视图 | **八大视图**：聊天 · 看板 · 任务树 · 甘特 · 日历 · 白板 · 文件 · 驾驶舱 |
| 项目管理强依赖云端账号 | **群组内 P2P**，局域网发现，无中心服务器 |
| 敏感文件只能走 SaaS | **本地 SQLite**（可选用通行词加密库文件），传输加密，**LibreOffice 本地预览** |
| 飞秋 / 飞鸽好用但没有任务 | **保留 IM 体验** + 看板、日历、白板、依赖关系 |

## 🚀 核心能力

| 领域 | 要点 |
|------|------|
| **沟通** | 群聊 / 私聊、@提及、代码高亮、`/task` 与 `#` 引用、消息↔任务、离线补同步（聊天 / 任务 / 已读 / **文件库索引**）、发现与 VPN 种子。可选**会议插件**：未购引导升级；Lite mesh / Pro LiveKit 档位可见；内网旁路最短运维见文档 |
| **项目管理** | 看板、任务树、甘特、日历、四类依赖、标签、验收清单、Presence、工期健康度。可选**排程插件**（`lanpm.schedule`，可购）：甘特关键路径含 FS/SS/FF/SF、按群冻结基线、同负责人显式日期重叠提示。可选**敏捷插件**（`lanpm.agile`，可购）：卡片故事点、列合计、剩余点燃尽、列 WIP 上限提示（不拦拖拽） |
| **协作** | Excalidraw 白板 + 脑图（群内 P2P Yjs CRDT）、群文件、LibreOffice 预览、断点续传 |
| **组织与体验** | 项目 / 职能 / 匿名群、领导驾驶舱、亮暗主题、**中 / 英**。可选**周报插件**（`lanpm.weekly`，可购）：周报含下周计划、月报独立模板。可选**备份插件**（`lanpm.backup`，免费、**默认开**）：Profile 里单群加密 `.lanpm-bundle`；关插件则隐藏该区 |
| **安全** | TCP 链路上 AES-GCM。配对成功或首次 TOFU 后把对端 ECDH 公钥钉到 `deviceId` — 局域网中间人无法再静默换钥。首次发现仍是信任首次使用。本地优先 SQLite，**可选用通行词加密库文件**。Win/macOS/Linux × x64/arm64 安装包。 |

完整能力、协议与验收脚本 → [docs/00](./docs/00_文档导航.md) · [PRD](./docs/01_产品需求文档.md) · [CHANGELOG](./CHANGELOG.md)。

## ⚡ 快速开始

**环境：** Node.js 20+、npm 10+、Git。

```bash
git clone <你的仓库地址> lanpm && cd lanpm
chmod +x onekey_run.sh    # 首次（Unix）
./onekey_run.sh start     # 或：npm install && npm run dev
```

| 系统 | 命令 |
|------|------|
| Windows CMD | `onekey_run.bat start` |
| PowerShell | `.\onekey_run.ps1 start` |
| Git Bash / WSL | `./onekey_run.sh start` |

首次启动走配置向导，随后进入示例群 `#/g/demo-project/chat`。

## 🛠️ 开发者

```bash
npm run lint && npm run typecheck && npm run test
npm run verify:p0          # 守卫（IPC、i18n、文档、截图布局）
npm run verify:chat-perf-observe  # 聊天性能代码守卫（本地 .cursorGrowth/decisions 若存在）
npm run measure:perf -- --quick   # Electron 基线 JSON → `.lanpm/perf/`（见 docs/05 §5）
npm run verify:linux-installer-smoke  # Linux 安装包守卫；LANPM_REQUIRE_INSTALLER=1 可启动 unpacked
npm run measure:list-scroll -- --schema-only   # 四页长列表滚动 schema（完整跑需要 build）
npm run verify:m7          # 发版前全量回归
npm run build
```

| 说明 | 注意 |
|------|------|
| README 配图 | `npm run screenshots:capture` → `npm run screenshots:sync-readme`（[docs/screenshots](./docs/screenshots/README.md)） |
| 英文折行 | `npm run verify:i18n-en` · `npm run verify:visual-screenshots-en`（驾驶舱 + 聊天 `en-US` PNG；Linux 用 `xvfb-run`） |
| 验收 | 以 **Electron**（`npm run dev`）为准 — 浏览器 stub（`npm run dev:web`）仅 UI 预览 |
| 聊天性能 QA | 预算见本地 `.cursorGrowth/decisions/chat-perf.md` · 守卫 → `verify:chat-perf*` |
| 发版 | [docs/05](./docs/05_测试与联调发布.md) · 跨平台矩阵 §1.4 |
| 真网 / 局域网 | `npm run verify:m6` 是本机 **loopback**，不是两台电脑。双机手验见 [docs/05 §6](./docs/05_测试与联调发布.md#6-局域网真网联调m6)（人工；CI 不跑） |
| 性能基线 | `npm run measure:perf` · `verify:measure-perf` · `measure:list-scroll` / `verify:list-scroll`（聊天/看板/文件/甘特卡顿）· `verify:linux-installer-smoke`（静态；`LANPM_REQUIRE_INSTALLER=1` 启动 unpacked → 聊天 Tab）· [docs/05 §5](./docs/05_测试与联调发布.md#5-性能测量m7) — Linux 默认关 GPU（`LANPM_ENABLE_GPU=1` 可 opt-in；`--quick` RSS **不对标** 200MB）；看板/树/文件/驾驶舱 lazy 分包；驾驶舱一次 JOIN；文件 chunk 进度 IPC 100ms 节流；库探测只读 16 字节头；任务写操作本地 patch |

Agent 工作流（Super Cursor）：[`/plan` · `/run`](./.cursor/AGENTS.md) — 详见 [`.cursor/`](./.cursor/)。

## 📚 文档

| | |
|--|--|
| [项目主页](https://wangqiqi.github.io/lanpm/zh/) | VitePress 站点（快速开始、能力概览） |
| [docs/00 — 导航](./docs/00_文档导航.md) | 产品与工程文档索引 |
| [ROADMAP](./docs/06_ROADMAP.md) | backlog 与里程碑 |
| [plugins](./plugins/README.md) | 官方插件目录 |

**当前版本 `1.106.16`** — GitHub Pages 项目主页（VitePress）。测试收口：日历与 dev:web E2E、双机/冷启动/会议/AI 等 `verify:*-playbook` 守卫；双机种子会跳过本机 `IP:43124`；发现/组网 UX P0–P2（项目群默认看板；发现弹窗连通→选群两步）；项目群底栏默认折叠甘特/日历（导航偏好可开）。可购敏捷：剩余故事点燃尽 + 列 WIP 提示 + 迭代容器 + 完成点速度图。可购排程：冻结基线 + 指派日期重叠提示。周报下周计划 + 月报独立模板。免费 `lanpm.backup`（默认开）。许可 [AGPL-3.0-or-later](./LICENSE)。

---

<p align="center">
  <sub><a href="README.md">English</a> · 简体中文</sub><br />
  <sub>为「既要飞秋般爽快沟通，又要正经项目管理、还不愿把数据交给公有云」的团队而生。</sub>
</p>
