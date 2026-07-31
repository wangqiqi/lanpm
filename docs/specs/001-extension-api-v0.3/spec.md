# Feature Specification: Extension API v0.3

**Created**: 2026-07-31  
**Status**: Approved for Sprint  
**Sprint id**: extension-api-v0.3

## Summary

为插件提供**受控写能力**：`task.patch`（字段白名单）与 `board.moveTask`（看板列移动）。Host 侧统一经 `capabilityProxy`，禁止插件直连 DB/IPC 任务写接口。

## User Stories

### US1 — 插件更新任务字段 (P1)

插件在 manifest 声明 `task.patch` 后，可更新任务的 **title · status · progressPercent · priority · tags**。

**Given** 插件已启用且声明 capability  
**When** `invokeCapability('task.patch', { groupId, taskId, patch })`  
**Then** 返回更新后的 `Task`；未声明字段被拒绝；群不可写时抛错

### US2 — 插件移动看板卡片 (P1)

插件声明 `board.moveTask` 后，可变更任务 `status` / `sortOrder`（与 UI 拖拽等价）。

**Given** 任务属于 `groupId`  
**When** `invokeCapability('board.moveTask', { groupId, taskId, status, sortOrder? })`  
**Then** 返回移动后的 `Task`；校验 `assertTaskWritable`

### US3 — 样例与守卫 (P2)

`lanpm.example` 演示只读探测后的 `task.patch`；`verify:extension-api-v0.3` 防回退。

## Out of Scope (v0.3)

- `task.create` · `chat.sendText` · `file.upload`
- `assigneeUserId` · `parentTaskId` · 日程字段 · `linkedFileIds` 写入
- 人审 UI / 二次确认弹窗（记入 v0.4 候选）
- Extension API v1.0 市场能力

## Edge Cases

- 任务不存在 → `stub.taskNotFound`
- patch 含非白名单键 → 拒绝并说明字段名
- `status: other` 无 `otherReason` → 现有校验错误
- 插件未声明 capability → `capability not granted`
- paid 插件未授权 → 现有 `assertPaidPluginLicensed`

## Success Metrics

- `npm run verify:extension-api-v0.3` 绿
- `npm run verify:project` 绿
- `docs/插件开发.md` §4.1 / §4.4 列出 v0.3 能力
