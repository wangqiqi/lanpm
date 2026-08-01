# Feature Specification: Chat Performance P3 (chat-perf-p3)

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: chat-perf-p3  
**Depends on**: v1.84.0 chat-perf-follow（`docs/优化.md` §6 序 1–9、11–12）

## Summary

闭合 `docs/优化.md` **§6 序 10** 及 §5 仍开放的 P1/P3 性能债：插件菜单 IPC 按 `location` 过滤、气泡 Router 钩子上提、高亮/Markdown 深度缓存、模块级无界 Map 有界化、`replyQuote` 预计算、`MessageBubble` props 瘦身。

## User Stories

### US1 — 插件菜单 IPC（序 10）

**Given** 聊天页仅需 `chat.message.context` 菜单  
**When** Provider / `usePluginMenus` 拉取  
**Then** 主进程 `listMenus(location?)` 仅返回该 location；无参仍返回全量（兼容）

### US2 — Router 钩子上提（§2.11）

**Given** 虚拟列表挂载 N 个 `MessageBubble`  
**When** 渲染  
**Then** 气泡内无 `useNavigate` / `useParams` / `useLocateTask`；经 `ChatMessageActionsContext` 消费

### US3 — 高亮降级 + LRU（§5.6 / §5.12）

**Given** 未知语言或超长代码  
**When** `highlightCode`  
**Then** 禁 `highlightAuto` → `plaintext`；长度上限；`(lang,codeHash)` LRU ≈200

### US4 — Markdown 解析缓存（§5.17）

**Given** 同 `msgId` 文本未变  
**When** 父组件重渲染  
**Then** `MarkdownView` / `ChatMessageText` 按 `msgId+textHash` 命中缓存

### US5 — Props 瘦身（§5.11）

**Given** 无 `@` / `#` 的纯文本消息  
**When** `MessageBubble` 渲染  
**Then** 不传完整 `members`/`tasks`；发件人用 `memberById`

### US6 — 模块级缓存有界（§5.14）

**Given** 长跑多群 / 大量通知  
**When** `notifiedIds` / `scrollMemoryByGroup` 增长  
**Then** LRU 或上限常量（10k / 20 群）

### US7 — replyQuote 预计算（§5.3）

**Given** 可见消息列表  
**When** `renderMessage`  
**Then** 只读 `replyQuotesByMsgId` Map，不在回调内逐条 `resolveReplyQuote`

## Out of Scope

- 视口外整气泡 Markdown 卸载（`chat-perf-viewport`）
- 高亮 Worker / `requestIdleCallback`
- `TopBar` 8s 网络轮询
- 打 tag / push → `/release`

## Success Metrics

- `npm run verify:chat-perf-p3` 绿
- `verify:chat-perf-follow` · `verify:chat-perf` · `typecheck` 仍绿
- CHANGELOG **1.85.0** · `docs/优化.md` §6 序 10 ✅
