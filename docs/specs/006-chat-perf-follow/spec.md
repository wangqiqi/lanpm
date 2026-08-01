# Feature Specification: Chat Performance Follow-up (chat-perf-follow)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: chat-perf-follow  
**Depends on**: v1.83.0 chat-perf（`docs/优化.md` §6 序 1–4、8）

## Summary

继续降低聊天 **CPU 尖峰** 与 **内存线性增长**：成员轮询/已读减负、store 增量写入、DM 轻量订阅、每群内存窗口、代码/Markdown 懒处理。

## User Stories

### US1 — 侧栏 presence (P1 · 序 5)

**Given** 成员侧栏折叠或页面不可见  
**When** 用户不在看侧栏  
**Then** 无 `setInterval` 轮询；间隔 ≥10s

### US2 — 已读增量 (P1 · 序 5)

**Given** 仅己方消息 delivery 更新  
**When** `useMarkRead` 运行  
**Then** 不因 `messages` 引用变化重复扫全表

### US3 — Store 写入 (P1 · 序 9)

**Given** 实时追加新消息  
**When** `upsertMessage`  
**Then** 单调追加 O(1)；patch 原位；乱序才 sort

### US4 — DM 轻量 (P1 · 序 9、12)

**Given** DM 面板展示多会话  
**When** 非当前 DM  
**Then** 不批量 `loadMessages` 全量历史；行级 selector 不订阅整表

### US5 — 内存窗口 (P1 · 序 7)

**Given** 单群 >2000 条或切群  
**When** merge / 切换 `groupId`  
**Then** 每群软上限 2000；非活跃群降级为 lastMessage 预览

### US6 — 懒高亮 / memo (P1 · 序 6、11)

**Given** 折叠长代码或未改文本  
**When** 渲染  
**Then** 折叠态不 `highlightCode`；`ChatMessageText` memo

## Out of Scope

- `MessageBubble` Router 钩子上提 · `notifiedIds` LRU · TopBar 轮询
- 主进程 `listMenus({ location })`（留 chat-perf-p3）
- Worker 高亮

## Success Metrics

- `npm run verify:chat-perf-follow` 绿
- `verify:chat-perf` · `verify:message-context-v2` · `typecheck` 仍绿
- CHANGELOG **1.84.0**
