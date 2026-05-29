# LanPM

分布式局域网/VPN 协作客户端（Electron）— 即时通讯 + 项目管理 + 文件共享。

## 当前状态

- **RC**：`1.0.0-rc.27`（M0–M7 已闭环；发布门禁见 [docs/06](./docs/06_验收与里程碑计划.md) §2）
- **说明**：`verify:m7` 通过表示自动化回归达标，不等于 PRD P0 全部完成或已达 1.0.0 发布门禁
- 全量回归：`npm run verify:m7`
- 验收清单：[docs/06_验收与里程碑计划.md](./docs/06_验收与里程碑计划.md)

## 本地开发

```bash
chmod +x onekey_run.sh   # 首次
./onekey_run.sh          # 交互菜单：start / stop / status / build / check …
./onekey_run.sh start    # 后台启动 dev，日志见 .lanpm/dev.log

npm install      # postinstall 会自动将 better-sqlite3 对齐到 Electron ABI
npm run dev      # 启动前也会自动检测并重编（若 ABI 不一致）
npm run lint     # ESLint
npm run typecheck
npm run test        # Vitest 单元（tests/unit，见 docs/05 §1）
npm run verify:m7   # 全量回归（含 test + verify:* 集成）
npm run build       # 生产构建
```

### 浏览器 Stub 与 Electron 差异（`UX-DEV-01`）

| 场景 | Electron（`npm run dev`） | 浏览器 Vite（`:5173`，若启用 stub） |
|------|---------------------------|-------------------------------------|
| IPC / SQLite | 主进程 `getLanpmApi()` 真实或 Stub | `browserLanpmStub.ts` 内存桩 |
| 文件上传/预览 | 系统对话框 + 本地路径 | 受限或 mock |
| 路由 | HashRouter `#/g/...` | 同 Hash，但无 Electron 窗口壳 |
| 推荐验收 | **以 Electron 为准** | 仅 UI 快速预览 |

Stub 错误文案走 i18n（`verify:i18n-en` 守卫）；浏览器桩与 Electron 行为差异见上表。

### 手动验收 M1 路由（需已完成首次配置）

1. `npm run dev`，进入主壳后默认 `#/g/demo-project/chat`。
2. 底部 5 个 Tab 切换，地址栏 hash 依次为 `.../chat|board|tree|gantt|files`，主区标题对应变化。
3. 顶栏下拉选「示例职能群」：看板/任务树/甘特置灰，仅聊天与文件可点。
4. 选「示例匿名群」：仅聊天可点；手动访问 `#/g/demo-anonymous/board` 应重定向到 `.../chat`。
5. 浏览器地址输入 `#/cockpit` 进入驾驶舱占位页（无底栏）。

## 文档（开发必读）

| 文档 | 说明 |
|------|------|
| [docs/00_文档导航.md](./docs/00_文档导航.md) | 索引、追溯矩阵、已拍板决策 |
| [docs/01_产品需求文档.md](./docs/01_产品需求文档.md) | 产品需求（PRD） |
| [docs/02_技术实现建议.md](./docs/02_技术实现建议.md) | 架构、网络（§13.6 手动添加节点）、非功能 |
| [docs/03_数据模型与协议草案.md](./docs/03_数据模型与协议草案.md) | 实体、协议、SQLite（v0.2 基线） |
| [docs/04_交互与UI约定.md](./docs/04_交互与UI约定.md) | 布局、主题、组件约定 |
| [docs/05_测试与联调发布.md](./docs/05_测试与联调发布.md) | Vitest、verify:*、联调、视觉手验 |
| [docs/06_验收与里程碑计划.md](./docs/06_验收与里程碑计划.md) | P0 验收、里程碑、RC 发布门禁 |

## 技术选型

**目标架构（PRD）**

- 桌面：Electron
- 前端：React 18 + TypeScript + **Ant Design 5.x**
- 样式：**CSS Modules**；状态：**Zustand**
- 甘特图：**gantt-task-react**（M4）
- 存储：SQLite + IndexedDB（热缓存）
- 同步：Yjs（任务）+ P2P/WebRTC（消息/文件）
- 传输加密：UDP/TCP 发现 + 应用层 AES-GCM/DH（字段说明见 [docs/02](./docs/02_技术实现建议.md)）
- Office 预览：LibreOffice 本地转换（数据不出域）

**当前 RC 实现**：主路径为 Electron + React + **SQLite（唯一持久化层）** + TCP/Stub 联调；Yjs/WebRTC/IndexedDB 热缓存为 post-RC；**7 天离线补同步**与文件断点续传/限速已落地 RC（见 [docs/01 §1.3.1](./docs/01_产品需求文档.md)）。

## 开发排期摘要

| 阶段 | 内容 |
|------|------|
| M0–M1 | 工程骨架、首次配置、主框架 5 视图 |
| M2–M5 | 业务模块（聊天/任务/文件/群组/驾驶舱），**NetworkStub 联调** |
| M6 | 真实 UDP/WebRTC 替换 Stub |
| M7 | 验收、性能、发布（见 [docs/06](./docs/06_验收与里程碑计划.md) §2） |

发布前手验与联调步骤见 [docs/05](./docs/05_测试与联调发布.md)。

## 版本

当前 RC 号见 `package.json`；验收状态见 [docs/06_验收与里程碑计划.md](./docs/06_验收与里程碑计划.md) §2。
