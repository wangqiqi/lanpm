# Tech Plan: Extension API v0.3

## Architecture

```
Plugin renderer → getLanpmApi().plugin.invokeCapability
  → preload → main ipc plugin:invokeCapability
  → capabilityProxy.invokePluginCapability
  → taskService.updateGroupTask / moveGroupTask
```

## Capability Contracts

### `task.patch`

```typescript
type TaskPatchArgs = {
  groupId: string
  taskId: string
  patch: {
    title?: string
    status?: TaskStatus
    progressPercent?: number
    priority?: TaskPriority
    tags?: string[]
  }
}
```

- Proxy 剥离非白名单键；`groupId` 与任务 `groupId` 须一致
- 复用 `updateGroupTask`（含 CRDT · broadcast）

### `board.moveTask`

```typescript
type BoardMoveTaskArgs = {
  groupId: string
  taskId: string
  status: TaskStatus
  sortOrder?: number
  otherReason?: string
}
```

- 复用 `moveGroupTask`；校验 `groupId` 一致

## Files

| 层 | 文件 |
|----|------|
| SSOT | `src/shared/plugin/types.ts` · `capabilityTypes.ts` |
| Main | `src/main/plugin/capabilityProxy.ts` |
| Dev stub | `src/renderer/src/platform/browserLanpmStub.ts` |
| Demo | `plugins/lanpm.example/plugin.json` · `ExampleStub.tsx` |
| Verify | `tests/static/verify-extension-api-v0.3.ts` |
| Docs | `docs/插件开发.md` §4 |

## Security

- manifest 声明 + enabled + license 闸（沿用 v0.2）
- 字段白名单在 proxy **单一**实现，不散落 renderer
- 不写 `assigneeUserId` 等高风险字段
