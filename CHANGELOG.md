# Changelog

本文件记录 LanPM 项目变更，最新条目在最上方。

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
