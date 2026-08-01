# 决策 · 聊天性能（chat-perf）

**状态**：主序列 **v1.83.0 – v1.93.0 已闭合**（2026-08-01）  
**叙事**：根目录 `CHANGELOG.md`（`[1.83.0]` – `[1.93.0]`）

## 拍板摘要

| 主题 | 决策 |
|------|------|
| 插件菜单 / Slot | 会话级单例；禁止 per-bubble `usePluginMenus` / `PluginZoneHost` |
| 列表 | `@tanstack/react-virtual`；`MessageBubble` memo + 稳定 props |
| Store | 追加 O(1) · 2000 条/群内存窗口 · DM `listDmPreviews` IPC |
| 重内容 | 视口 defer · 折叠延后高亮 · LRU · **Worker 异步高亮**（v1.93） |
| 顶栏网络 | `useNetworkIdlePoll` 可见性门控（v1.92） |

## 性能预算（packaged build）

| 指标 | 通过阈值 |
|------|----------|
| 首屏 Scripting（3s） | < 800ms |
| 滚动 Scripting（10s） | < 500ms |
| 守卫 | `verify:chat-perf*` 全绿；禁止气泡内 `usePluginMenus` / `useSlotPlugins` |

## 发版前抽检（人工）

1. 大群（≥500 条）Performance 录 10s，对照上表预算。  
2. `npm run verify:chat-perf-observe` && 全链 `verify:chat-perf*`。  
3. 完整走查表与实测记录：本地 Growth 归档（不进 Git）。

## Out of scope（已闭合）

Shiki 替换 hljs · 插件商店 · 主进程 P2P 心跳优化。
