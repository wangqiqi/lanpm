# Sprint archive · ui-excalidraw-chrome-vibe

- **日期**：2026-07-12
- **版本**：1.29.0
- **Goal**：全产品壳层与主视图对齐 Excalidraw **外壳气质**（浮岛感、大圆角、软阴影、留白、淡色选中）— 非画布手绘；亮+暗同等。

## 交付

| ID | 摘要 |
|----|------|
| TASK-360 | `global.module.css` radius 8/12/16/20 · selected-bg · shadow-island · surface-elevated |
| TASK-361 | `ThemeProvider` Ant 圆角/elevated/selected 对齐 |
| TASK-362 | TopBar / BottomNav / MainLayout 通栏岛感 + 淡选中 |
| TASK-363 | 聊天工作区/侧栏/己方气泡 |
| TASK-364 | 看板列/卡片 |
| TASK-365 | 树 · 甘特 · 日历 |
| TASK-366 | 文件 · 发现 · 驾驶舱 |
| TASK-367 | `docs/04` 气质 SSOT · CHANGELOG/README · `verify:visual` 走 Electron Node |

## 拍板回顾

- 品牌：**LanPM 蓝** + 淡选中（非 Excalidraw 紫）
- 壳形态：通栏岛感，非完全浮条
- Out of scope：素描图标、会议插件、市场

## 验收

- `npm run lint && npm run typecheck && npm run verify:visual && npm run test:unit`
- 交付走查：亮暗壳层无 Blocker（CSS/token 级；真机截图未做）
