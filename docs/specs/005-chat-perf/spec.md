# Feature Specification: Chat Performance (chat-perf)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: chat-perf

## Summary

降低聊天页 CPU/内存与消息条数 N 的线性耦合：插件 IPC 会话级缓存、列表渲染减负、长会话虚拟滚动。

## User Stories

### US1 — 插件菜单单例 (P1)

**Given** 群内有 N 条消息  
**When** 进入聊天页  
**Then** `listMenus` 每 location **一次**；`MessageBubble` 不挂载 `usePluginMenus`

### US2 — Slot 缓存 (P1)

**Given** N 条消息曾挂 `chat.message.action`  
**When** 进入聊天  
**Then** `listSlotPlugins` 与 N 解耦；气泡内无 `PluginZoneHost`

### US3 — 列表渲染 (P1)

**Given** 用户打字或多选  
**When** 单条 state 变更  
**Then** `MessageBubble` memo + 稳定 props；单例右键菜单（非 N 个 Dropdown）

### US4 — 虚拟列表 (P1)

**Given** 500+ 条历史  
**When** 滚动  
**Then** DOM 节点 ≈ 视口行数；与按日分组、上拉加载兼容

## Out of Scope

- `messagesByGroup` 内存窗口 · 成员轮询 · 懒高亮 · store 增量（follow-up Sprint）

## Success Metrics

- `npm run verify:chat-perf` 绿
- `verify:message-context-v2` · `typecheck` 仍绿
- CHANGELOG **1.83.0**
