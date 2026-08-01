# Spec 013 — DM Preview IPC (dm-preview-ipc)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: dm-preview-ipc  
**Depends on**: v1.90.0 chat-perf-store-hooks · `docs/优化.md` §5.15

## Summary

DM 会话列表每行曾通过 `useChatStore(messagesByGroup[sessionId])` 订阅整群消息数组，任意消息变更会触发所有行重渲染。本 Sprint 在主进程提供 **`listDmPreviews` 轻量 IPC**，按群返回末条消息元数据；Renderer 用共享 `messagePreviewText` 生成预览文案，并在 `onMessage` push 时增量 patch。

## Goal

1. `CHAT_IPC.listDmPreviews` 返回各 DM 群末条消息（`DmMessagePreview[]`）。
2. `DmSessionRow` 不再订阅 `messagesByGroup`。
3. 新消息 / 撤回 / 编辑 push 后对应群预览即时更新。
4. `verify:dm-preview-ipc` 静态守卫；`verify:chat-perf*` 仍绿。

## User Stories

| ID | Story | Acceptance |
|----|-------|------------|
| US-1 | 打开 DM 侧栏不拉全量 messages 到 chatStore | `DmSessionRow` 无 `messagesByGroup` selector |
| US-2 | 预览与末条消息一致 | SQLite `ROW_NUMBER` 末条 + `messagePreviewText` |
| US-3 | 收到新 DM 消息预览更新 | `onMessage` patch `dmPreviewStore` |
| US-4 | 浏览器预览可用 | `browserLanpmStub.chat.listDmPreviews` |

## Data Model

```typescript
/** 单群 DM 预览；preview 由 renderer 用 lastMessage + i18n 派生 */
export interface DmMessagePreview {
  groupId: string
  lastAt: string | null // ISO createdAt
  lastMessage: ChatMessage | null
}
```

IPC 返回 `DmMessagePreview[]`（仅 `group_id LIKE 'dm:%'` 且有消息的群）。

Renderer 展示：

```typescript
const preview = entry?.lastMessage
  ? messagePreviewText(entry.lastMessage, t('chat.recalledPreview'))
  : ''
```

## IPC

| Channel | Args | Returns |
|---------|------|---------|
| `CHAT_IPC.listDmPreviews` | — | `Promise<DmMessagePreview[]>` |

## Out of Scope

- TopBar 8s 轮询（→ `topbar-network-idle`）
- Worker 高亮（→ `SPIKE-highlight-worker`）
- 非 DM 群列表 preview
- DM 全历史预载策略变更

## Acceptance

```bash
npm run verify:dm-preview-ipc
npm run verify:chat-perf-store-hooks && npm run verify:chat-perf && npm run typecheck
```
