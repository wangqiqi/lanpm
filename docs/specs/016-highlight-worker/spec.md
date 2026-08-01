# Spec 016 — Highlight.js Web Worker (highlight-worker)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: highlight-worker  
**Depends on**: [SPIKE 015](../015-highlight-worker-spike/spike.md) · v1.86 chat-perf-viewport · `highlightSetup.ts`

## Summary

将 `highlightCode` 迁入 Dedicated Web Worker，展开长代码块时主线程不阻塞。保留 defer + 折叠 + LRU + 50k 上限；Worker 不可用时回退主线程同步高亮。

## Goal

1. `highlight.worker.ts` — module worker，12 语言与主线程一致。
2. `highlightCodeAsync(code, lang, signal?)` — 请求去重、AbortSignal 取消、renderer LRU。
3. `CodeBlock` — async 高亮 UI；折叠/离屏/卸载丢弃陈旧响应。
4. `verify:highlight-worker` 静态守卫 + 单测。

## User Stories

| ID | Story | Acceptance |
|----|-------|------------|
| US-1 | 展开长代码块不阻塞 render | `CodeBlock` 用 `useEffect` + async，非 `useMemo(highlightCode)` |
| US-2 | 快速滚动/折叠不展示错块 | `AbortSignal` + generation 丢弃陈旧 HTML |
| US-3 | 缓存命中即时显示 | renderer LRU 在 postMessage 前检查 |
| US-4 | Worker 失败可降级 | `highlightCode` 同步 fallback |
| US-5 | 离屏仍不高亮 | `deferHeavyContent` 路径不变 |

## Worker 契约

```typescript
// → worker
{ type: 'highlight'; id: number; code: string; language: string }
// ← renderer
{ type: 'highlight'; id: number; ok: true; html: string }
| { type: 'highlight'; id: number; ok: false; error: string }
```

## Out of Scope

- Shiki / WASM 替换 hljs
- `requestIdleCallback` 单独队列
- DB 预高亮持久化
- 变更视口 defer 策略

## Acceptance

```bash
npm run verify:highlight-worker
npm run verify:chat-perf && npm run verify:chat-perf-viewport && npm run typecheck
```
