# Feature Specification: Chat Performance Viewport (chat-perf-viewport)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: chat-perf-viewport  
**Depends on**: v1.85.0 chat-perf-p3

## Summary

虚拟列表已限制 DOM 行数，但 **overscan 内仍全量 Markdown / 高亮 / 头像解码**。本 Sprint 按 **严格视口** defer 重内容，并落地 Markdown 图片 `loading="lazy"`。

## User Stories

### US1 — 视口门控

**Given** 消息行在虚拟列表 overscan 但不在严格视口  
**When** 渲染气泡  
**Then** `deferHeavyContent=true`；不进 `MarkdownView` / `highlightCode`

### US2 — 可复制纯文本

**Given** defer 态文本消息  
**When** 用户选中复制  
**Then** 仍为原始纯文本（非空占位）

### US3 — 媒体懒加载

**Given** Markdown 含 `![]()` 或未来图片附件  
**When** 在视口内  
**Then** `<img loading="lazy">`；defer 态不设置 `src`

### US4 — 头像 defer

**Given** 离屏消息行  
**When** 显示发送者头像  
**Then** 不请求 `avatarUrl`（字母占位）

## Out of Scope

- 高亮 Worker / `requestIdleCallback`
- 主进程 `listDmPreviews`
- `ChatView` Zustand `getState` 减负
- TopBar 网络轮询

## Success Metrics

- `npm run verify:chat-perf-viewport` 绿
- `verify:chat-perf-p3` · `verify:chat-perf-follow` · `verify:chat-perf` · `typecheck` 仍绿
- CHANGELOG **1.86.0**

## §10.4 性能抽检（人工 · 非 CI）

| 步骤 | 操作 | 通过标准 |
|------|------|----------|
| 1 | `npm run build` 后启动 packaged / preview | 非 dev HMR |
| 2 | 进入 ≥500 条消息群 | 首屏可交互 |
| 3 | Performance 录 10s 滚动 | Scripting 无持续 `highlightCode` / `ReactMarkdown` 尖峰于离屏 |
| 4 | Memory 快照：滚动前后 | Detached DOM 无异常增长 |
| 5 | 快速滚动后停住 | 停住 1s 内重内容渲染完整 |
