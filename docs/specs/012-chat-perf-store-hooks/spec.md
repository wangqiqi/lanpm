# Spec 012 — Chat Performance Store Hooks (chat-perf-store-hooks)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: chat-perf-store-hooks  
**Depends on**: v1.87.0 chat-perf-observe · `docs/优化.md` §5.19

## Summary

`ChatView` 通过 Zustand 订阅了 15+ 个**动作函数**（`sendText`、`loadMessages` 等），任意 store 更新都会触发重渲染。本 Sprint 将动作访问收敛为 handler/effect 内 `getState()`，仅保留按 `groupId` 的**数据切片**订阅。

## Goal

1. `ChatView` 的 `useChatStore` 订阅 ≤ 6 条数据 selector（messages · hasMore · loading · loadingOlder · loadError）。
2. 提供 `chatStoreActions`（或等价模块）作为动作访问 SSOT。
3. `DmSessionBar` · `MemberList` 同类收敛。
4. `docs/优化.md` §5.19 标 ✅；`verify:chat-perf-store-hooks` 静态守卫。

## User Stories

| ID | Story | Acceptance |
|----|-------|------------|
| US-1 | 打字时 ChatView 不因无关 store 字段变更重渲染 | 动作函数不经 `useChatStore((s) => s.sendText)` 订阅 |
| US-2 | 群类型/权限仍正确 | `groupType` 经 `groups` 数据 selector 派生 |
| US-3 | DM 侧栏预加载仍工作 | `DmSessionBar` effect 内 `getState().loadMessages` |

## Pattern

```typescript
// ❌ 订阅动作 — 任意 chatStore 更新触发 ChatView 重渲染
const sendText = useChatStore((s) => s.sendText)

// ✅ handler 内 getState
await chatStoreActions.sendText(gid, text)
```

渲染期群类型：

```typescript
const groupType = useNavigationStore((s) =>
  s.groups.find((g) => g.groupId === gid)?.type ?? 'project'
)
```

## Out of Scope

- `listDmPreviews` IPC · TopBar 轮询 · Worker 高亮
- `chatStore` 内部重构

## Acceptance

```bash
npm run verify:chat-perf-store-hooks
npm run verify:chat-perf && npm run verify:chat-perf-follow && npm run verify:chat-perf-p3
npm run typecheck
```
