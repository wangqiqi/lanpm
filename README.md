# LanPM

分布式局域网/VPN 协作客户端（Electron）— 即时通讯 + 项目管理 + 文件共享。

## 当前状态

- **RC**：`1.0.0-rc.1`（M0–M7 P0 闭环）
- 全量回归：`npm run verify:m7`
- 验收清单：[docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md)

## 本地开发

```bash
npm install
npm run dev      # 启动 Electron 开发模式
npm run lint     # ESLint
npm run typecheck
npm run verify:m7   # 全量回归（含 rebuild:native + M0–M7）
npm run build       # 生产构建
```

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
| [docs/02_技术实现建议.md](./docs/02_技术实现建议.md) | 架构、网络、非功能指标 |
| [docs/03_验收与里程碑计划.md](./docs/03_验收与里程碑计划.md) | P0 验收与 20 天排期 |
| [docs/04_数据模型与协议草案.md](./docs/04_数据模型与协议草案.md) | 实体、协议、SQLite（v0.2 基线） |
| [docs/05_交互与UI约定.md](./docs/05_交互与UI约定.md) | 布局、主题、组件约定 |
| [docs/06_测试与联调手册.md](./docs/06_测试与联调手册.md) | Stub/真网/性能测试 |
| [docs/07_M3_看板与任务树实现说明.md](./docs/07_M3_看板与任务树实现说明.md) | M3 看板/任务树实现与 IPC |
| [docs/08_M7_RC验收清单.md](./docs/08_M7_RC验收清单.md) | M7 RC 验收 |
| [todo.md](./todo.md) | **唯一任务真源**（RC / v1.1 / UI·UX·评估项） |
| [archive/20260529_095839_plan概述_SSOT后归档.md](./archive/20260529_095839_plan概述_SSOT后归档.md) | 执行计划概述（只读） |

## 技术选型（已拍板）

- 桌面：Electron
- 前端：React 18 + TypeScript + **Ant Design 5.x**
- 样式：**CSS Modules**；状态：**Zustand**
- 甘特图：**gantt-task-react**（M4）
- 存储：SQLite + IndexedDB（热缓存可选）
- 同步：Yjs（任务）+ P2P（消息/文件）
- 传输加密：UDP 发现 + WebRTC DataChannel + 应用层 AES-GCM/DH/HMAC
- Office 预览：LibreOffice 本地转换（数据不出域）

## 开发排期摘要

| 阶段 | 内容 |
|------|------|
| M0–M1 | 工程骨架、首次配置、主框架 5 视图 |
| M2–M5 | 业务模块（聊天/任务/文件/群组/驾驶舱），**NetworkStub 联调** |
| M6 | 真实 UDP/WebRTC 替换 Stub |
| M7 | 验收、性能、发布 |

待办与排期见 [todo.md](./todo.md)；计划背景见 [archive/plan 概述](./archive/20260529_095839_plan概述_SSOT后归档.md)。

## 查看历史原型（可选）

```bash
# 归档路径
archive/prototypes/index.html
archive/prototypes/index2.html
```

## 版本

最新文档版本见 [CHANGELOG.md](./CHANGELOG.md) 顶部条目。
