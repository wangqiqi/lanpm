# Feature Specification: Extension API v0.5

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: extension-api-follow

## Summary

为插件增加 **聊天文本发送** 与 **文件上传** 写能力：`chat.sendText` · `file.upload`。两能力经 Host 代理，复用 v0.4 **人审**（`pending_confirm` + `confirmCapability`）。`chat.sendTaskRef` 保持直写。

## User Stories

### US1 — chat.sendText 人审 (P1)

**Given** 插件声明 `chat.sendText`  
**When** `invokeCapability('chat.sendText', { groupId, text, replyToMsgId? })`  
**Then** 返回 `pending_confirm`；确认后调用 `sendTextMessage` 并返回 `ChatMessage`

### US2 — file.upload 人审 (P1)

**Given** 插件声明 `file.upload`  
**When** `invokeCapability('file.upload', { groupId, sourcePath })`  
**Then** 返回 `pending_confirm`；Host 校验路径存在且为文件、大小上限；确认后 `uploadFileFromPath` 返回 `FileMeta`

### US3 — 白名单字段 (P1)

| 能力 | 允许字段 |
|------|----------|
| `chat.sendText` | `groupId` · `text` · `replyToMsgId?` |
| `file.upload` | `groupId` · `sourcePath` |

### US4 — 样例与守卫 (P2)

`lanpm.example` 演示发送文本 + 上传；`verify:extension-api-v0.5` 防回退；v0.4 回归仍绿。

## Mode

**B** — 与 v0.4 相同：Main `pending_confirm` + `plugin:confirmCapability`。

## Out of Scope

- `chat.sendMarkdown` · `ai.streamChat`
- `chat.sendTaskRef` 改为人审
- Host 原生选文件对话框 capability
- 插件商店 · 打 tag / push

## Edge Cases

- 空 `text` → 拒绝（确认前）
- `sourcePath` 不存在 / 为目录 / 超大 → 拒绝
- pending 过期 / 会话不符 → 与 v0.4 相同
- 用户取消 Modal → 不 confirm

## Success Metrics

- `npm run verify:extension-api-v0.5` 绿
- `npm run verify:extension-api-v0.4` 仍绿
- `npm run typecheck` 绿
- CHANGELOG **1.82.0**；`docs/插件开发.md` §4 增 **v0.5** 行
