# Feature Specification: Extension API v0.4

**Created**: 2026-07-31  
**Status**: Approved for Sprint  
**Sprint id**: api-v0.4-human-review

## Summary

为插件写操作增加 **Host 强制人审**：`task.create` · `task.patch` · `board.moveTask` 经 `invokeCapability` 时返回 `pending_confirm`，须二次 `confirmCapability` 才落库。`chat.sendTaskRef` 保持直写（本版不人审）。

## User Stories

### US1 — 写操作进入待确认 (P1)

**Given** 插件已声明写 capability  
**When** `invokeCapability('task.patch' | 'board.moveTask' | 'task.create', …)`  
**Then** 返回 `{ status: 'pending_confirm', pendingId, capability, pluginId }`，**不**写库

### US2 — 用户确认后落库 (P1)

**Given** 存在未过期 pending  
**When** `confirmCapability(pluginId, pendingId)`  
**Then** 执行对应写路径并返回 `Task`；pending 一次性消费

### US3 — task.create 白名单 (P1)

**Given** 插件声明 `task.create`  
**When** 确认后创建  
**Then** 仅允许 `groupId` · `title` · `status?` · `priority?` · `tags?`；拒绝 assignee/日程等字段

### US4 — 样例与守卫 (P2)

`lanpm.example` 演示「提议 → Modal 确认 → 落库」；`verify:extension-api-v0.4` 防回退。

## Mode

**B** — Main 返回 `pending_confirm` + 二次 IPC `plugin:confirmCapability`（插件无法绕过 Host）。

## Out of Scope

- 商店 UI · 应用市场
- `chat.sendTaskRef` / `chat.sendText` / `file.upload` 人审
- 完整 LanpmApi · assignee / 日程写入 create
- 打 tag / push

## Edge Cases

- pending 过期或不存在 → `pending not found`
- confirm 的 pluginId 与 pending 不符 → 拒绝
- 会话用户与创建 pending 时不符 → 拒绝
- create/patch 非白名单字段 → 拒绝（确认前或确认时）
- 用户取消 Modal → 不调用 confirm；pending 可 TTL 过期

## Success Metrics

- `npm run verify:extension-api-v0.4` 绿
- `npm run verify:extension-api-v0.3` 仍绿
- `npm run typecheck` 绿
- CHANGELOG **1.80.0**；文档 §4：v0.4 = 写人审
