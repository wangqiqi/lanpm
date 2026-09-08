# 核心能力

LanPM 把 **飞秋级畅聊** 和 **正经项目管理视图** 放进同一壳，数据在 **群组内 P2P** 同步。

## 沟通

- 群聊 / 私聊、@提及、代码高亮
- `/task` 与 `#` 引用、消息↔任务联动
- 离线补同步（聊天、任务、已读、文件库索引）
- 发现与 VPN 种子
- 可选 **会议插件**：Lite mesh / Pro LiveKit

## 项目管理

- 看板、任务树、甘特、日历
- FS / SS / FF / SF 依赖、标签、验收清单
- Presence、工期健康度
- 可选 **排程插件**（`lanpm.schedule`）：关键路径、冻结基线
- 可选 **敏捷插件**（`lanpm.agile`）：故事点、燃尽、WIP 提示、速度图

## 协作

- Excalidraw 白板 + 脑图（群内 P2P Yjs CRDT）
- 群文件、LibreOffice 预览、断点续传

## 组织与体验

- 项目 / 职能 / 匿名群
- 领导驾驶舱
- 亮暗主题、**中 / 英**
- 可选 **周报插件**（`lanpm.weekly`）：Markdown 导出
- 可选 **备份插件**（`lanpm.backup`，免费、默认开）：加密 `.lanpm-bundle`

## 安全

| 层级 | 说明 |
|------|------|
| 传输 | TCP 链路 AES-GCM |
| 身份 | 配对 / 首次 TOFU 后将 ECDH 公钥钉到 `deviceId` |
| 存储 | 本地优先 SQLite，可选用通行词加密库文件 |
| 预览 | 设备上 LibreOffice — 文件留在局域网 |

## 官方插件

目录与打包见 [plugins README](https://github.com/wangqiqi/lanpm/tree/master/plugins)。

## 完整规格

产品与工程 SSOT 在仓库内：

- [docs/00 — 导航](https://github.com/wangqiqi/lanpm/blob/master/docs/00_文档导航.md)
- [PRD](https://github.com/wangqiqi/lanpm/blob/master/docs/01_产品需求文档.md)
- [ROADMAP](https://github.com/wangqiqi/lanpm/blob/master/docs/06_ROADMAP.md)
- [CHANGELOG](https://github.com/wangqiqi/lanpm/blob/master/CHANGELOG.md)
