# Sprint · meeting-plugin-host → v1.67.0

**日期**：2026-07-31  
**Goal**：`lanpm.meeting` stub + 媒体 capability + 聊天语音面板接 `chat.toolbar.media`

## 交付

| TASK | 交付物 |
|------|--------|
| TASK-841 | 4 个 `media.*` capability 入 types |
| TASK-842 | `capabilityProxy` stub |
| TASK-843 | `plugins/lanpm.meeting/plugin.json`（默认关闭） |
| TASK-844 | `MeetingStub` + registry + i18n |
| TASK-845 | `ChatVoiceMediaPanel` 替代 `voiceComingSoon` |
| TASK-846 | `verify:meeting-plugin` · tag v1.67.0 |

## 验收

```bash
npm run verify:meeting-plugin && npm run verify:meeting-spike
npm run verify:view-slot-hosts && npm run test:unit
```

## 下一 Sprint

- `meeting-lite-mesh-poc` — 真实 Lite mesh 信令
- `nav-preferences-mvp` / `multi-view-slot-wiring`
