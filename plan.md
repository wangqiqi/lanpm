# LanPM 推进计划

> 更新：2026-05-29 · **rc.59** · 手验 SSOT → [docs/06](./docs/06_验收与里程碑计划.md) §2.6

## 已完成（rc.54–rc.58）

- 数据产销闭环 `DATA-*`（含 SCHEMA-FK、Bundle IPC+UI）
- 设置页数据与存储、删父确认、DM 对齐
- V-14b-HOV / VIS-08 静态门禁 + docs/06 DOC-02；SCHEMA-FK 记入 `docs/03` §12
- **rc.57–rc.58**：解散群组、Mock v2、单元测试 152 项、成员资料弹窗、根目录 `todo.md`/`数据.md` 归档
- **微信借鉴 WX-01～03 / WX-05～06**：新消息跳转、DM 预览、in-chat header、全量通知开关；WX-04 系统消息样式（撤回待协议）

## 待办（须真机/人手）

见 [docs/06 §2.6](./docs/06_验收与里程碑计划.md#26-手验待办ssot)。

```bash
npm run verify:release-gate
```

---

## 微信借鉴 — 聊天体验增强

> 设计备忘：[微信借鉴.md](./微信借鉴.md)  
> **原则**：借「单会话聊天手感」与 IM 微习惯；**不**做三栏会话中心（LanPM 群 = 项目，数量少，TopBar 切群即可）。

### 已完成对照（勿重复排期）

| ID | 项 | 实现 |
|----|-----|------|
| — | 气泡左右布局、连续消息压缩 | `MessageBubble.tsx` |
| — | 日期分隔 pill | `chat.module.css` `.dayLabel` |
| — | Composer 工具栏 + 可拖拽高度 + 拖文件发送 | `ChatView.tsx` |
| — | Enter 发送 / Shift+Enter 换行 | UX-F-08 |
| — | BottomNav 聊天未读 + 看板待办角标 | UX-F-18 / `badgeStore` |
| — | 私聊 Segmented + `DmSessionBar` + 选中高亮 | `ChatView` / `DmSessionBar` |
| — | 已读回执 / 投递状态 | `chatStore` + `MessageBubble` |
| WX-01 | 新消息跳转「N 条新消息 ↓」 | `useNewMessageScroll` + `ChatView` |
| WX-02 | DM 最后消息预览 + 时间 | `DmSessionBar` + `messagePreview` |
| WX-03 | in-chat header（在线人数 + 群文件） | `ChatView` `.chatContextBar` |
| WX-04 | 系统消息居中弱文案 | `MessageBubble`（撤回待协议） |
| WX-05 | 全局搜索 → 消息 scroll + 高亮 | `useSearchHighlight` |
| WX-06 | 全量新消息桌面通知 + 设置开关 | `useChatNotifications` + `ProfileModal` |

### 待办清单

| 状态 | ID | 优先级 | 任务 | 说明 |
|:----:|----|--------|------|------|
| [ ] | **WX-04b** | P2 | **消息撤回** | 协议 / 主进程支持 `recall` 后再做 UI |

### 明确不做

- 三栏 IM（图标栏 + 中间海量会话列表 + 聊天区）
- 微信绿主色、语音/视频主入口、社交型群设置（公告/二维码等）
- 详见 [微信借鉴.md §4](./微信借鉴.md#4-明确不借鉴)

### 完成定义

- 对应项勾选 `[x]`，并在 [CHANGELOG.md](./CHANGELOG.md) 逆序记录
- UI 变更跑 `npm run verify:visual`；涉及 i18n 跑 `verify:i18n-keys`
- [微信借鉴.md](./微信借鉴.md) §3 / §5 同步更新「状态」列
