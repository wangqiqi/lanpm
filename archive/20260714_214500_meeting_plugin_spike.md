# Sprint archive · meeting-plugin-spike

- **日期**：2026-07-14
- **版本**：1.30.1
- **Goal**：拍板可购会议插件 `lanpm.meeting` 技术路径与 Host 扩展缺口（无真实媒体实现）

## 交付

| ID | 摘要 |
|----|------|
| SPIKE-374 | Lite mesh vs Pro LiveKit/Jitsi 选型 + SKU 档 |
| SPIKE-375 | `chat.toolbar.media` Slot · 媒体 capability · voice 接线 |
| SPIKE-376 | `verify:meeting-spike` · docs/06 §3 同步 |

## 拍板摘要

- **Lite**：WebRTC mesh（2～4 人）+ Host 代理投屏
- **Pro**：LiveKit 自托管 SFU（Jitsi Plan B）
- **禁**：默认公有云 SFU · 核心 deps 引媒体 SDK

## Out of scope（未做）

真实 WebRTC/LiveKit 运行时 · 离线许可证闸 · 插件市场 · 会议 UI
