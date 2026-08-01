# Spec 011 — Meeting Productization（meeting-productization）

**Created**: 2026-08-01  
**Status**: Approved for Sprint  
**Sprint id**: meeting-productization  
**Depends on**: v1.81.0 meeting-ux-next（录制 + 日程 MVP）

## Summary

在 v1.81.0 录制/日程 MVP 之上完成**体验产品化**：主进程提醒 i18n、通知点击深链到群、日程列表「加入会议」、面板时长/时间 i18n；文档与实现对齐。

## Goal

1. **主进程提醒 i18n**：`meetingReminderService` 不再硬编码中文；与 renderer `plugin.meetingReminder*` 文案一致（经 `shared/media/meetingReminderCopy.ts`）。
2. **Locale 同步**：renderer `setLocale` 写入 `userData/locale.json`；主进程读取用于通知文案。
3. **通知深链**：桌面提醒点击 → 聚焦主窗 → 切换到预约所在群（`/g/{groupId}/chat`）。
4. **日程 join CTA**：`MeetingSchedulePanel` 近期列表项可触发 join（mesh，与工具条主 join 一致）。
5. **面板 i18n**：时长 Select 与列表时间格式尊重 app locale。
6. **文档**：`docs/插件开发.md` §8.3 录制/日程产品化标 ✅；CHANGELOG `[1.89.0]`。

## Out of scope

- 云端录制 · 日程跨设备 Sync · 完整日历视图
- 编辑已有预约（仍仅 create/delete + join CTA）
- 商店 / 新 capability 白名单
- 通知点击后自动 join 会议（仅切群）

## User stories

| ID | Story | Acceptance |
|----|-------|------------|
| US-1 | 英文界面用户收到英文桌面提醒 | 主进程 title/body 与 `en-US` `plugin.meetingReminder*` 一致 |
| US-2 | 点击会议提醒进入对应群聊 | Electron 通知 `click` → 主窗聚焦 + 路由 `/g/{groupId}/chat` |
| US-3 | 从日程列表一键加入会议 | 列表项「加入会议」调用与工具条相同的 mesh `joinRoom` |
| US-4 | 日程面板时长与时间格式本地化 | 无硬编码 `15 min`；`formatScheduleWhen` 使用 `AppLocale` |

## Technical design

### Locale file

- Path: `userData/locale.json` — `{ "locale": "zh-CN" | "en-US" }`
- IPC: `locale:get` · `locale:set`（renderer `uiStore.setLocale` 同步）
- Default: `zh-CN`（文件缺失时）

### Reminder copy

- `src/shared/media/meetingReminderCopy.ts` — title/body/when 格式化（主进程 + 可单测）
- `meetingReminderService` 传入 `groupId` 给 `showDesktopNotification`

### Notification navigate

- Channel: `notification:navigate` — payload `{ groupId: string }`
- `showDesktopNotification(title, body, { groupId? })` — `click` 时 `broadcastToAllWindows` + `showMainWindow`

### Schedule panel join

- `MeetingSchedulePanel` 可选 props：`onJoinMeeting?: () => Promise<void>` · `joinMeetingDisabled?: boolean`
- `MeetingToolbar` 传入 `onJoin` 与 disabled 态

## Acceptance

```bash
npm run verify:meeting-productization
npm run verify:meeting-ux
npm run verify:meeting-recording
npm run verify:meeting-schedule
npm run typecheck
```
