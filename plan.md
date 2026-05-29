# LanPM 推进计划

> 更新：2026-05-29 · **rc.60** · 手验 SSOT → [docs/06](./docs/06_验收与里程碑计划.md) §2.6

## 已完成（rc.54–rc.60）

- 数据产销闭环 `DATA-*`（含 SCHEMA-FK、Bundle IPC+UI）
- 设置页数据与存储、删父确认、DM 对齐
- V-14b-HOV / VIS-08 静态门禁 + docs/06 DOC-02；SCHEMA-FK 记入 `docs/03` §12
- **rc.57–rc.58**：解散群组、Mock v2、单元测试 152 项、成员资料弹窗、根目录 `todo.md`/`数据.md` 归档
- **rc.59–rc.60**：微信借鉴 WX-01～06 / WX-04b 消息撤回、甘特导出裁剪

## 待办（须真机/人手）

见 [docs/06 §2.6](./docs/06_验收与里程碑计划.md#26-手验待办ssot)。

```bash
npm run verify:release-gate
```

---

## 微信借鉴 — 聊天体验增强

> 设计备忘：[微信借鉴.md](./微信借鉴.md)  
> **原则**：借「单会话聊天手感」与 IM 微习惯；**不**做三栏会话中心（LanPM 群 = 项目，数量少，TopBar 切群即可）。

### 已完成对照

| ID | 项 | 实现 |
|----|-----|------|
| WX-01 | 新消息跳转 | `useNewMessageScroll` |
| WX-02 | DM 最后消息预览 | `DmSessionBar` + `messagePreview` |
| WX-03 | in-chat header | `ChatView` `.chatContextBar` |
| WX-04 | 系统消息居中弱文案 | `MessageBubble` |
| WX-04b | 消息撤回 | `recallMessageService` + `chat_recall` 同步 |
| WX-05 | 搜索消息高亮 | `useSearchHighlight` |
| WX-06 | 全量新消息通知 | `useChatNotifications` + 个人设置 |

### 明确不做

- 三栏 IM、微信绿主色、语音/视频主入口、社交型群设置 — 见 [微信借鉴.md §4](./微信借鉴.md#4-明确不借鉴)

### 完成定义

- [CHANGELOG.md](./CHANGELOG.md) 逆序记录 · `verify:visual` / `verify:i18n-keys` · 同步 [微信借鉴.md](./微信借鉴.md)
