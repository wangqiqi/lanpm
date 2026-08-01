# Spec 014 — TopBar Network Idle Poll (topbar-network-idle)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: topbar-network-idle  
**Depends on**: v1.91.0 dm-preview-ipc · `docs/优化.md` §4 / §5 P3

## Summary

`TopBar` 每 8s 静默调用 `refreshNetwork`，即使用户切到其它标签页仍持续 IPC。本 Sprint 对齐 `MemberList` presence 模式：`document.visibilityState === 'hidden'` 时跳过 interval tick；回到 `visible` 时立即补刷一次。

## Goal

1. `useNetworkIdlePoll` 封装 interval + visibility 门控 + visible 补刷。
2. `TopBar` 移除裸 `setInterval(..., 8000)`。
3. 手动「刷新网络」菜单项行为不变（直接 `refreshNetwork()`）。
4. `verify:topbar-network-idle` 静态守卫。

## User Stories

| ID | Story | Acceptance |
|----|-------|------------|
| US-1 | 后台标签页不白跑网络 IPC | tick 内 `visibilityState === 'hidden'` 则 return |
| US-2 | 切回应用网络状态及时 | `visibilitychange` → visible 触发一次 silent refresh |
| US-3 | 首次进应用仍立即拉状态 | `onMount` 非 silent `refreshNetwork()` |

## Pattern

```typescript
// MemberList presence（对齐）
const tick = () => {
  if (document.visibilityState === 'hidden') return
  onRefresh()
}

// TopBar（本 Sprint）
useNetworkIdlePoll({
  onMount: () => void refreshNetwork(),
  onTick: () => void refreshNetwork({ silent: true })
})
```

## Out of Scope

- 会议 Mesh / 发现配对 / 任务提醒等其它 interval
- 主进程 P2P 心跳
- 推送式网络状态

## Acceptance

```bash
npm run verify:topbar-network-idle
npm run verify:topbar && npm run verify:chat-perf && npm run typecheck
```
