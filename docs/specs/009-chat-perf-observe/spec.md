# Feature Specification: Chat Performance Observe (chat-perf-observe)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: chat-perf-observe  
**Depends on**: v1.86.0 chat-perf-viewport

## Summary

chat-perf 系列（v1.83–v1.86）已落地虚拟列表、插件单例、store 增量、视口 defer 等优化。本 Sprint **不写运行时功能**，建立**可重复的观测闭环**：性能预算、packaged 抽检步骤、人工回归模板；CI 用 `verify:chat-perf-observe` 守卫文档与脚本入口。

## Goal

1. 定义可度量的**性能预算**（CPU / 内存 / DOM），供发版前人工对比。
2. 提供 **packaged build** 抽检 playbook（非 `npm run dev`）。
3. 与 `docs/优化.md` §10.4 观测链对齐；静态 verify 防文档漂移。

## Out of Scope

- DevTools Performance/Memory **自动化**进 CI
- `ChatView` Zustand `getState()` 减负（→ chat-perf-store-hooks）
- `listDmPreviews` IPC（→ dm-preview-ipc）
- 高亮 Worker / TopBar 轮询门控

## User Stories

### US1 — 性能预算可查

**Given** 维护者准备发版或验收聊天性能  
**When** 打开本 spec §Budget  
**Then** 有明确阈值、测量环境与通过/失败判定

### US2 — 人工抽检可复现

**Given** packaged 或 `npm run build` 后启动  
**When** 按 `docs/templates/chat-perf-regression.md` 执行  
**Then** 步骤含 ≥500 条群、Performance 10s、Memory 快照、记录表

### US3 — CI 守卫文档

**Given** PR 删除 spec / 模板 / verify 脚本  
**When** `npm run verify:chat-perf-observe`  
**Then** 失败并指出缺失文件

## Budget（性能预算 · v1.86 基线）

> **环境**：`npm run build` 后 Electron packaged / preview；**关闭** DevTools 后再录 Performance（开面板本身占内存）。  
> **样本群**：≥500 条历史消息、含 Markdown/代码/图片若干。  
> **记录**：填 `docs/chat-perf-baseline.md`；发版前后对比。

| 指标 | 阈值（通过） | 测量方式 | 备注 |
|------|-------------|----------|------|
| **首屏 Scripting** | 进入聊天后 3s 内主线程 Scripting 累计 **< 800ms** | Performance 录 3s（进入群瞬间开始） | v1.86 参考 ~400–600ms；>1s 须调查 |
| **滚动 Scripting** | 10s 匀速滚动 Scripting 累计 **< 500ms** | Performance 录 10s | 无离屏 `highlightCode` / `ReactMarkdown` 持续尖峰 |
| **停滚恢复** | 快速滚动停住后 **≤ 1s** 视口内重内容完整 | 目测 + Elements | defer 解除后 MD/代码可读 |
| **DOM 节点** | 滚动中 DOM 节点数 **亚线性**于历史总条数 | Memory → DOM 计数或 Elements 估算 | 虚拟列表：视口 ± overscan，非 N 条全量 |
| **Heap 增长** | 进大群 → 滚动 30s → 切群：Heap **无阶梯式暴涨** | Memory 快照对比 | Detached DOM / Listener 无异常累积 |
| **插件 IPC** | 进大群首屏 `listMenus` **≤ 2 次**（含 location 缓存 miss） | Performance 搜 `listMenus` 或 IPC 断点 | 禁止 N×气泡 hook |
| **静态守卫** | `verify:chat-perf*` 全绿 | CI / 本地 | 见 Success Metrics |

### 非目标（本预算不覆盖）

- 主进程 P2P 心跳 CPU（见 `docs/优化.md` §4）
- `npm run dev` + HMR 体感（仅开发参考）
- 浏览器 stub（`dev:web`）— Electron 为真源

## §10.4 抽检步骤（人工 · 非 CI）

| 步 | 操作 | 通过标准 |
|----|------|----------|
| 1 | `npm run build` → 启动 packaged / preview | 非 dev HMR |
| 2 | 进入 ≥500 条消息群，等待首屏稳定 | 可输入、可滚动 |
| 3 | Performance：录 **3s**（进入瞬间） | §Budget 首屏 Scripting |
| 4 | Performance：录 **10s** 匀速滚动 | §Budget 滚动 Scripting；无离屏 MD/高亮尖峰 |
| 5 | Memory：快照 A（进群后）→ 滚动 30s → 快照 B | Heap / Detached DOM 无异常 |
| 6 | 切到其他群再切回 | 无泄漏式累积（对比 B） |
| 7 | 填写 `docs/chat-perf-baseline.md` | 版本号 + 日期 + 实测值 |
| 8 | `npm run verify:chat-perf-observe` && 全链 `verify:chat-perf*` | CI 绿 |

详细勾选表 → `docs/templates/chat-perf-regression.md`。

## Success Metrics

- `npm run verify:chat-perf-observe` 绿
- `verify:chat-perf-viewport` · `verify:chat-perf-p3` · `verify:chat-perf-follow` · `verify:chat-perf` · `typecheck` 仍绿
- `docs/优化.md` §9 现状列 · §10.4 · §11 与 v1.87.0 对齐
- CHANGELOG **1.87.0**

## Related

- `docs/优化.md` §3 验证方法 · §5.7 性能预算 · §10.4 观测
- `docs/chat-perf-baseline.md` — 基线记录表
- `docs/templates/chat-perf-regression.md` — 发版前走查表
