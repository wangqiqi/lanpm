# LanPM

分布式局域网/VPN 协作客户端（Electron）— 即时通讯 + 项目管理 + 文件共享。

## 当前状态

- 文档基线：`v0.3.1`（见 [CHANGELOG.md](./CHANGELOG.md)）
- 代码：M0 尚未开始（无 `src/` 工程目录）
- 历史 HTML 原型已归档至 [archive/prototypes/](./archive/prototypes/)

## 文档（开发必读）

| 文档 | 说明 |
|------|------|
| [docs/00_文档导航.md](./docs/00_文档导航.md) | 索引、追溯矩阵、已拍板决策 |
| [docs/01_产品需求文档.md](./docs/01_产品需求文档.md) | 产品需求（PRD） |
| [docs/02_技术实现建议.md](./docs/02_技术实现建议.md) | 架构、网络、非功能指标 |
| [docs/03_验收与里程碑计划.md](./docs/03_验收与里程碑计划.md) | P0 验收与 20 天排期 |
| [docs/04_数据模型与协议草案.md](./docs/04_数据模型与协议草案.md) | 实体、协议、状态机 |
| [plan.md](./plan.md) | 执行计划（M0–M7） |

## 技术选型（已拍板）

- 桌面：Electron
- 前端：React 18 + TypeScript
- 存储：SQLite + IndexedDB
- 同步：Yjs（任务）+ P2P（消息/文件）
- Office 预览：LibreOffice 本地转换（数据不出域）

## 开发排期摘要

| 阶段 | 内容 |
|------|------|
| M0–M1 | 工程骨架、首次配置、主框架 5 视图 |
| M2–M5 | 业务模块（聊天/任务/文件/群组/驾驶舱），**NetworkStub 联调** |
| M6 | 真实 UDP/WebRTC 替换 Stub |
| M7 | 验收、性能、发布 |

详见 [plan.md](./plan.md)。

## 查看历史原型（可选）

```bash
# 归档路径
archive/prototypes/index.html
archive/prototypes/index2.html
```

## 版本

最新文档版本见 [CHANGELOG.md](./CHANGELOG.md) 顶部条目。
