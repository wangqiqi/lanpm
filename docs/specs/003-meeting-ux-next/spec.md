# Spec 003 — Meeting UX Next（录制 + 日程 MVP）

**Sprint**: meeting-ux-next · **Target**: v1.81.0

## Goal

1. **本地录制**：用户加入 Lite mesh 或 LiveKit Pro 会议后可开始录制，停止后保存到本机（`showSaveDialog`）。
2. **群级会议日程**：每群可创建轻量预约（标题 + 开始时间 + 时长），本机 JSON 持久化，不经 Sync。
3. **桌面提醒**：开始前 5 分钟与开始时各一条通知（主进程；浏览器开发桩由 renderer 轮询兜底）。

## Out of scope

- 云端 / SFU 侧录制
- 日程跨设备 Sync
- 完整日历视图
- Extension 写 capability
- 预约自动发群聊系统消息

## Data model

### `MeetingSchedule`（`src/shared/media/meetingSchedule.ts`）

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID |
| `groupId` | `string` | 群 scope |
| `title` | `string` | 1–120 字符 |
| `startsAt` | `string` | ISO 8601 |
| `durationMinutes` | `number` | 15–240，默认 30 |
| `createdAt` | `string` | ISO 8601 |

持久化：`userData/meeting-schedules.json`（数组）。

### Recording

- Renderer：`MediaRecorder` + `getUserMedia`（音/视频）
- 保存：`meeting:saveRecording` → `showSaveDialog` → `writeFileSync`
- 默认扩展名：`.webm`

## IPC（`MEETING_IPC`）

| Channel | Args | Returns |
|---------|------|---------|
| `saveRecording` | `{ bytes: Uint8Array, suggestedName?: string }` | `{ saved: boolean; path?: string }` |
| `listSchedules` | `groupId?: string` | `MeetingSchedule[]` |
| `createSchedule` | `CreateMeetingScheduleInput` | `MeetingSchedule` |
| `deleteSchedule` | `{ id: string }` | `{ ok: true }` |

## UI

- **MeetingToolbar**：录制钮（入会后可点）· 计时 Tag · 停止并保存
- **MeetingSchedulePanel**（Popover 内）：表单 + 近期列表（群 scoped）· 删除

## Reminder

- 扫描间隔：30s（主进程）
- 提前量：5min + start（各一次，内存去重键 `remind:{id}:5min` / `remind:{id}:start`）
- 浏览器桩：`useMeetingScheduleReminders`（`platform === 'browser'`）

## Acceptance

```bash
npm run verify:meeting-recording
npm run verify:meeting-schedule
npm run verify:meeting-ux
npm run typecheck
```
