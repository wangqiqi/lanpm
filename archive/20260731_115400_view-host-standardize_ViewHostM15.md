# Sprint · view-host-standardize → v1.66.0

**日期**：2026-07-31  
**Goal**：ViewHost M1.5 基建 — context 驱动 Slot 宿主 + 7 核心 Tab toolbar 空锚点

## 交付

| TASK | 交付物 |
|------|--------|
| TASK-831 | `src/shared/plugin/viewHost.ts` |
| TASK-832 | `PluginSlotId` 扩展 + `validateManifest` 白名单 |
| TASK-833 | `PluginSlotHost` · `PluginZoneHost` · `PluginGroupSlot` · `PluginTaskSlot` |
| TASK-834 | `src/renderer/src/plugin/viewSlotMap.ts` |
| TASK-835 | 7 视图 `data-plugin-zone="toolbar"` 锚点 |
| TASK-836 | `verify:view-slot-hosts` · CHANGELOG · v1.66.0 |

## 验收

```bash
npm run verify:view-slot-hosts
npm run lint && npm run typecheck && npm run build
npm run verify:visual && npm run verify:i18n-keys && npm run test:unit
```

## 下一 Sprint

- `meeting-plugin-host`（依赖本 Sprint）
- `multi-view-slot-wiring`（composer/context/card/detail zone 真接线）
